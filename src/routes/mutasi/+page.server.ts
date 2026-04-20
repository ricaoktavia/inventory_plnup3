import { db } from '$lib/server/db';
import { ulps, materials, transactions, transactionDetails, stocks } from '$lib/server/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import QRCode from 'qrcode';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!user) return {};

	const allUlps = user.role === 'ADMIN_UP3' ? await db.select().from(ulps) : [];
	const allMaterials = await db.select().from(materials);

	// Fetch History
	const historyRows = await db.select({
		id: transactions.id,
		referenceNumber: transactions.referenceNumber,
		date: transactions.createdAt,
		targetUlpId: transactions.targetUlpId,
		targetUlp: ulps.name,
		status: transactions.status,
		type: transactions.type,
		takerName: transactions.takerName,
		usagePurpose: transactions.usagePurpose,
		materialName: materials.name,
		quantity: transactionDetails.quantity,
		description: transactionDetails.description
	})
	.from(transactions)
	.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
	.leftJoin(ulps, eq(transactions.targetUlpId, ulps.id))
	.leftJoin(materials, eq(transactionDetails.materialId, materials.id))
	.orderBy(desc(transactions.createdAt))
	.limit(200);

	// Group history rows by transaction to handle multi-item
	const historyMap = new Map();
	historyRows.forEach(row => {
		// Filter based on role
		if (user.role === 'ADMIN_UP3' && row.type === 'USAGE') return;
		if (user.role === 'ADMIN_ULP' && row.targetUlpId !== user.ulpId) return;

		if (!historyMap.has(row.id)) {
			historyMap.set(row.id, {
				id: row.id,
				referenceNumber: row.referenceNumber,
				date: row.date,
				targetUlp: row.targetUlp,
				status: row.status,
				type: row.type,
				takerName: row.takerName,
				usagePurpose: row.usagePurpose,
				items: []
			});
		}
		historyMap.get(row.id).items.push({
			name: row.materialName,
			quantity: row.quantity,
			description: row.description
		});
	});

	// Fetch pending drafts for ULP verification
	let pendingDrafts: any[] = [];
	if (user.role === 'ADMIN_ULP') {
		const draftRows = await db.select({
			id: transactions.id,
			ref: transactions.referenceNumber,
			takerName: transactions.takerName,
			date: transactions.createdAt,
			materialName: materials.name,
			unit: materials.unit,
			quantity: transactionDetails.quantity
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.innerJoin(materials, eq(transactionDetails.materialId, materials.id))
		.where(and(eq(transactions.targetUlpId, user.ulpId!), eq(transactions.status, 'DRAFT')));

		// Group drafts by transaction
		const draftMap = new Map();
		draftRows.forEach(row => {
			if (!draftMap.has(row.id)) {
				draftMap.set(row.id, {
					id: row.id,
					ref: row.ref,
					takerName: row.takerName,
					date: row.date,
					items: []
				});
			}
			draftMap.get(row.id).items.push({ name: row.materialName, quantity: row.quantity, unit: row.unit });
		});
		pendingDrafts = Array.from(draftMap.values());
	}

	return {
		ulps: allUlps,
		materials: allMaterials,
		history: Array.from(historyMap.values()),
		pendingDrafts,
		userRole: user.role,
		userUlpId: user.ulpId
	};
};

export const actions: Actions = {
	draft: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Hanya Admin UP3 yang dapat membuat Draf.' });

		const formData = await request.formData();
		const ulpId = formData.get('ulpId') as string;
		const takerName = formData.get('takerName') as string;
		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');
		const keterangans = formData.getAll('keterangan[]');

		if (!ulpId || !takerName || materialIds.length === 0) {
			return fail(400, { error: 'Lengkapi form Pihak Kedua dan minimal 1 material!' });
		}

		const refNumber = `DISTR-${Date.now()}`;
		const [insertTrx] = await db.insert(transactions).values({
			referenceNumber: refNumber,
			type: 'DISTRIBUTION',
			status: 'DRAFT',
			createdBy: user.id,
			targetUlpId: parseInt(ulpId),
			takerName: takerName
		});

		// Insert multi-item details
		for (let i = 0; i < materialIds.length; i++) {
			await db.insert(transactionDetails).values({
				transactionId: insertTrx.insertId,
				materialId: parseInt(materialIds[i] as string),
				quantity: parseInt(jumlahs[i] as string),
				description: keterangans[i] as string
			});
		}

		return { success: true, message: 'Draf Transaksi Distribusi Multi-item Berhasil Dibuat!' };
	},

	penggunaan: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const tanggal = formData.get('tanggal') as string;
		const usagePurpose = formData.get('usagePurpose') as string;
		const takerName = formData.get('takerName') as string;
		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');
		const keterangans = formData.getAll('keterangan[]');

		if (!tanggal || !usagePurpose || !takerName || materialIds.length === 0) {
			return fail(400, { error: 'Lengkapi detail pemakaian dan minimal 1 material!' });
		}

		const refNumber = `PEMAKAIAN-${user.ulpId}-${Date.now()}`;
		const [insertTrx] = await db.insert(transactions).values({
			referenceNumber: refNumber,
			type: 'USAGE',
			status: 'COMPLETED', // Directly completed for usage
			createdBy: user.id,
			targetUlpId: user.ulpId,
			takerName: takerName,
			usagePurpose: usagePurpose,
			createdAt: new Date(tanggal)
		});

		for (let i = 0; i < materialIds.length; i++) {
			const mId = parseInt(materialIds[i] as string);
			const qty = parseInt(jumlahs[i] as string);

			// Check stock availability
			const [currentStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, mId), eq(stocks.ulpId, user.ulpId!)));
			const [matInfo] = await db.select().from(materials).where(eq(materials.id, mId));

			if (!currentStock || currentStock.quantity < qty) {
				return fail(400, { 
					error: `Stok material "${matInfo?.name || 'TIDAK DIKENAL'}" tidak mencukupi! Sisa stok saat ini: ${currentStock?.quantity || 0}.` 
				});
			}
			
			await db.insert(transactionDetails).values({
				transactionId: insertTrx.insertId,
				materialId: mId,
				quantity: qty,
				description: keterangans[i] as string
			});

			// Deduct from ULP Stock directly
			await db.update(stocks)
				.set({ quantity: sql`quantity - ${qty}` })
				.where(and(eq(stocks.materialId, mId), eq(stocks.ulpId, user.ulpId!)));
		}

		return { success: true, message: 'Laporan Pemakaian Lapangan Berhasil Dicatat!' };
	},

	verifikasi: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		const fileBase64 = formData.get('fileBase64') as string;

		if (!trxId || !fileBase64) return fail(400, { error: 'Pilih transaksi dan unggah foto bukti!' });

		const [trx] = await db.select().from(transactions).where(eq(transactions.id, parseInt(trxId)));
		if (!trx || trx.targetUlpId !== user.ulpId || trx.status !== 'DRAFT') {
			return fail(400, { error: 'Transaksi tidak valid.' });
		}

		await db.update(transactions)
			.set({ status: 'APPROVED_ULP', photoBase64: fileBase64, approvedAt: new Date() })
			.where(eq(transactions.id, parseInt(trxId)));

		return { success: true, message: 'Verifikasi berhasil! Menunggu penyelesaian UP3.' };
	},

	finalisasi: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		if (!trxId) return fail(400, { error: 'ID Transaksi tidak valid.' });

		const [trx] = await db.select().from(transactions).where(eq(transactions.id, parseInt(trxId)));
		if (!trx || trx.status !== 'APPROVED_ULP') {
			return fail(400, { error: 'Transaksi tidak valid atau belum di-approve oleh ULP.' });
		}

		const details = await db.select().from(transactionDetails).where(eq(transactionDetails.transactionId, trx.id));
		if (details.length === 0) {
			return fail(400, { error: 'Detail transaksi distribusi tidak ditemukan.' });
		}

		// Mutasi Stok Real-time Logic (Multi-item)
		for (const detail of details) {
			// 1. Check & Deduct UP3 (ulpId IS NULL)
			const [up3Stock] = await db.select().from(stocks).where(and(eq(stocks.materialId, detail.materialId), sql`ulp_id IS NULL`));
			
			if (!up3Stock || up3Stock.quantity < detail.quantity) {
				const [matInfo] = await db.select().from(materials).where(eq(materials.id, detail.materialId));
				return fail(400, { 
					error: `Gagal finalisasi! Stok "${matInfo?.name}" di Gudang Pusat tidak mencukupi (Sisa: ${up3Stock?.quantity || 0}).` 
				});
			}

			await db.update(stocks)
				.set({ quantity: sql`quantity - ${detail.quantity}` })
				.where(and(eq(stocks.materialId, detail.materialId), sql`ulp_id IS NULL`));

			// 2. Add to ULP 
			const [ulpStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, detail.materialId), eq(stocks.ulpId, trx.targetUlpId!)));
			
			if (ulpStock) {
				await db.update(stocks)
					.set({ quantity: sql`quantity + ${detail.quantity}` })
					.where(eq(stocks.id, ulpStock.id));
			} else {
				await db.insert(stocks).values({
					materialId: detail.materialId,
					ulpId: trx.targetUlpId!,
					quantity: detail.quantity
				});
			}
		}

		// Generate QR Code with validation URL dynamic origin
		const origin = new URL(request.url).origin;
		const validationUrl = `${origin}/validasi/${trx.referenceNumber}`;
		const qrCodeBase64 = await QRCode.toDataURL(validationUrl);

		await db.update(transactions)
			.set({ status: 'COMPLETED', qrCodeBase64 })
			.where(eq(transactions.id, trx.id));

		return { success: true, message: 'Mutasi Stok Multi-item Selesai!' };
	}
};
