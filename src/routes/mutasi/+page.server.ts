import { db } from '$lib/server/db';
import { ulps, materials, transactions, transactionDetails, stocks } from '$lib/server/db/schema';
import { desc, eq, and, sql, asc, isNull } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import QRCode from 'qrcode';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!user) return {};

	const allUlps = user.role === 'ADMIN_UP3' 
		? await db.select().from(ulps).orderBy(asc(ulps.name)) 
		: [];
	const allMaterials = await db.select({
		id: materials.id,
		name: materials.name,
		unit: materials.unit,
		stock: sql<number>`COALESCE(${stocks.quantity}, 0)`
	})
	.from(materials)
	.leftJoin(stocks, and(
		eq(materials.id, stocks.materialId),
		user.role === 'ADMIN_UP3' ? isNull(stocks.ulpId) : eq(stocks.ulpId, user.ulpId!)
	))
	.orderBy(asc(materials.name));

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
		description: transactionDetails.description,
		requestLetter: transactions.requestLetterBase64,
		photo: transactions.photoBase64
	})
	.from(transactions)
	.leftJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
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
				requestLetter: row.requestLetter,
				photo: row.photo,
				items: []
			});
		}
		if (row.materialName) {
			historyMap.get(row.id).items.push({
				name: row.materialName,
				quantity: row.quantity,
				description: row.description
			});
		}
	});

	// Data for ULP: Pending Verifikasi (Distribution from UP3)
	let pendingVerifikasi: any[] = [];
	// Data for ULP: Draft Usage (Needs photo to finalize)
	let draftUsages: any[] = [];
	// Data for UP3: Pending Requests from ULP
	let requestedTransactions: any[] = [];

	if (user.role === 'ADMIN_ULP') {
		const pendingRows = await db.select({
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
		.where(and(eq(transactions.targetUlpId, user.ulpId!), eq(transactions.status, 'DRAFT'), eq(transactions.type, 'DISTRIBUTION')));

		const verifMap = new Map();
		pendingRows.forEach(row => {
			if (!verifMap.has(row.id)) {
				verifMap.set(row.id, { id: row.id, ref: row.ref, takerName: row.takerName, date: row.date, items: [] });
			}
			verifMap.get(row.id).items.push({ name: row.materialName, quantity: row.quantity, unit: row.unit });
		});
		pendingVerifikasi = Array.from(verifMap.values());

		const usageRows = await db.select({
			id: transactions.id,
			ref: transactions.referenceNumber,
			purpose: transactions.usagePurpose,
			date: transactions.createdAt,
			materialName: materials.name,
			unit: materials.unit,
			quantity: transactionDetails.quantity
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.innerJoin(materials, eq(transactionDetails.materialId, materials.id))
		.where(and(eq(transactions.targetUlpId, user.ulpId!), eq(transactions.status, 'DRAFT'), eq(transactions.type, 'USAGE')));

		const usageMap = new Map();
		usageRows.forEach(row => {
			if (!usageMap.has(row.id)) {
				usageMap.set(row.id, { id: row.id, ref: row.ref, purpose: row.purpose, date: row.date, items: [] });
			}
			usageMap.get(row.id).items.push({ name: row.materialName, quantity: row.quantity, unit: row.unit });
		});
		draftUsages = Array.from(usageMap.values());
	}

	if (user.role === 'ADMIN_UP3') {
		const reqRows = await db.select({
			id: transactions.id,
			ref: transactions.referenceNumber,
			ulpName: ulps.name,
			date: transactions.createdAt,
			requestLetter: transactions.requestLetterBase64
		})
		.from(transactions)
		.innerJoin(ulps, eq(transactions.targetUlpId, ulps.id))
		.where(eq(transactions.status, 'REQUESTED'));
		
		requestedTransactions = reqRows;
	}

	return {
		ulps: allUlps,
		materials: allMaterials,
		history: Array.from(historyMap.values()),
		pendingVerifikasi,
		draftUsages,
		requestedTransactions,
		userRole: user.role,
		userUlpId: user.ulpId
	};
};

export const actions: Actions = {
	// (ULP) Upload Surat Permintaan
	minta: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Hanya Admin ULP yang dapat membuat Permintaan.' });

		const formData = await request.formData();
		const letterBase64 = formData.get('letterBase64') as string;
		if (!letterBase64) return fail(400, { error: 'Wajib mengunggah Surat Permintaan!' });

		const refNumber = `REQ-${user.ulpId}-${Date.now()}`;
		await db.insert(transactions).values({
			referenceNumber: refNumber,
			type: 'DISTRIBUTION',
			status: 'REQUESTED',
			createdBy: user.id,
			targetUlpId: user.ulpId,
			requestLetterBase64: letterBase64
		});

		return { success: true, message: 'Permintaan Material Berhasil Diajukan!' };
	},

	// (UP3) Process requested transaction or create new one
	draft: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const requestId = formData.get('requestId') as string;
		const ulpId = formData.get('ulpId') as string;
		const takerName = formData.get('takerName') as string;
		const photoBase64 = formData.get('photoBase64') as string;
		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');
		const keterangans = formData.getAll('keterangan[]');

		if (!takerName || !photoBase64 || materialIds.length === 0) {
			return fail(400, { error: 'Lengkapi Nama Pengambil, Foto Dokumentasi, dan minimal 1 material!' });
		}

		// BACKEND STOCK VALIDATION (UP3)
		for (let i = 0; i < materialIds.length; i++) {
			const matId = parseInt(materialIds[i] as string);
			const qty = parseInt(jumlahs[i] as string);
			const [currentStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, matId), isNull(stocks.ulpId)));
			
			if (!currentStock || currentStock.quantity < qty) {
				const [mat] = await db.select().from(materials).where(eq(materials.id, matId));
				return fail(400, { error: `Gagal! Stok ${mat?.name} tidak cukup di Gudang Pusat.` });
			}
		}

		let trxId: number;
		if (requestId) {
			trxId = parseInt(requestId);
			await db.update(transactions).set({
				status: 'DRAFT',
				takerName: takerName,
				photoBase64: photoBase64
			}).where(eq(transactions.id, trxId));
		} else {
			if (!ulpId) return fail(400, { error: 'Tentukan ULP Tujuan untuk distribusi baru.' });
			const refNumber = `DISTR-${Date.now()}`;
			const [insertTrx] = await db.insert(transactions).values({
				referenceNumber: refNumber,
				type: 'DISTRIBUTION',
				status: 'DRAFT',
				createdBy: user.id,
				targetUlpId: parseInt(ulpId),
				takerName: takerName,
				photoBase64: photoBase64
			});
			trxId = insertTrx.insertId;
		}

		// Insert items
		for (let i = 0; i < materialIds.length; i++) {
			await db.insert(transactionDetails).values({
				transactionId: trxId,
				materialId: parseInt(materialIds[i] as string),
				quantity: parseInt(jumlahs[i] as string),
				description: keterangans[i] as string
			});
		}

		return { success: true, message: 'Distribusi Material Berhasil Diproses (Menunggu Konfirmasi ULP)!' };
	},

	// (ULP) Verifikasi Penerimaan
	verifikasi: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		if (!trxId) return fail(400, { error: 'Pilih transaksi yang akan dikonfirmasi.' });

		await db.update(transactions)
			.set({ status: 'APPROVED_ULP', approvedAt: new Date() })
			.where(and(eq(transactions.id, parseInt(trxId)), eq(transactions.targetUlpId, user.ulpId!)));

		return { success: true, message: 'Penerimaan telah dikonfirmasi!' };
	},

	// (ULP) Input Pemakaian Lapangan (Draft or Completed)
	penggunaan: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const tanggal = formData.get('tanggal') as string;
		const usagePurpose = formData.get('usagePurpose') as string;
		const takerName = formData.get('takerName') as string;
		const targetStatus = formData.get('targetStatus') as string; // 'DRAFT' or 'COMPLETED'
		const photoBase64 = formData.get('photoBase64') as string;
		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');
		const keterangans = formData.getAll('keterangan[]');

		if (!tanggal || !usagePurpose || !takerName || materialIds.length === 0) {
			return fail(400, { error: 'Lengkapi detail pemakaian dan minimal 1 material!' });
		}

		// BACKEND STOCK VALIDATION (ULP)
		for (let i = 0; i < materialIds.length; i++) {
			const matId = parseInt(materialIds[i] as string);
			const qty = parseInt(jumlahs[i] as string);
			const [currentStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, matId), eq(stocks.ulpId, user.ulpId!)));
			
			if (!currentStock || currentStock.quantity < qty) {
				const [mat] = await db.select().from(materials).where(eq(materials.id, matId));
				return fail(400, { error: `Gagal! Stok ${mat?.name} tidak cukup di gudang anda.` });
			}
		}

		if (targetStatus === 'COMPLETED' && !photoBase64) {
			return fail(400, { error: 'Wajib mengunggah foto bukti untuk konfirmasi pemakaian!' });
		}

		// Use a transaction for stock deduction if COMPLETED
		const result = await db.transaction(async (tx) => {
			if (targetStatus === 'COMPLETED') {
				for (let i = 0; i < materialIds.length; i++) {
					const matId = parseInt(materialIds[i] as string);
					const qty = parseInt(jumlahs[i] as string);
					
					const [currentStock] = await tx.select().from(stocks).where(and(eq(stocks.materialId, matId), eq(stocks.ulpId, user.ulpId!)));
					if (!currentStock || currentStock.quantity < qty) {
						const [mat] = await tx.select().from(materials).where(eq(materials.id, matId));
						throw new Error(`Stok ${mat?.name} tidak cukup.`);
					}
					await tx.update(stocks).set({ quantity: sql`quantity - ${qty}` }).where(eq(stocks.id, currentStock.id));
				}
			}

			const refNumber = `PEMAKAIAN-${user.ulpId}-${Date.now()}`;
			const [insertTrx] = await tx.insert(transactions).values({
				referenceNumber: refNumber,
				type: 'USAGE',
				status: targetStatus === 'COMPLETED' ? 'COMPLETED' : 'DRAFT',
				createdBy: user.id,
				targetUlpId: user.ulpId,
				takerName: takerName,
				usagePurpose: usagePurpose,
				photoBase64: targetStatus === 'COMPLETED' ? photoBase64 : null,
				createdAt: new Date(tanggal)
			});

			for (let i = 0; i < materialIds.length; i++) {
				await tx.insert(transactionDetails).values({
					transactionId: insertTrx.insertId,
					materialId: parseInt(materialIds[i] as string),
					quantity: parseInt(jumlahs[i] as string),
					description: keterangans[i] as string
				});
			}

			return { success: true };
		}).catch(err => {
			return { error: err.message };
		});

		if (result.error) return fail(400, { error: result.error });

		return { 
			success: true, 
			message: targetStatus === 'COMPLETED' 
				? 'Pemakaian Lapangan Berhasil Dikonfirmasi! Stok telah terpotong.' 
				: 'Draf Pemakaian Berhasil Disimpan (Belum Memotong Stok).' 
		};
	},

	// (ULP) Finalisasi Pemakaian Lapangan + Potong Stok
	finalisasiPemakaian: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		const photoBase64 = formData.get('photoBase64') as string;

		if (!trxId || !photoBase64) return fail(400, { error: 'Pilih draf pemakaian dan unggah foto bukti!' });

		const id = parseInt(trxId);
		const details = await db.select().from(transactionDetails).where(eq(transactionDetails.transactionId, id));
		
		// Validasi Stok dan Potong Stok
		for (const d of details) {
			const [currentStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, d.materialId), eq(stocks.ulpId, user.ulpId!)));
			if (!currentStock || currentStock.quantity < d.quantity) {
				const [mat] = await db.select().from(materials).where(eq(materials.id, d.materialId));
				return fail(400, { error: `Gagal! Stok ${mat?.name} tidak cukup.` });
			}
			await db.update(stocks).set({ quantity: sql`quantity - ${d.quantity}` }).where(eq(stocks.id, currentStock.id));
		}

		await db.update(transactions).set({
			status: 'COMPLETED',
			photoBase64: photoBase64
		}).where(eq(transactions.id, id));

		return { success: true, message: 'Pemakaian Lapangan Selesai! Stok telah terpotong.' };
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

		// Generate QR Code
		const origin = new URL(request.url).origin;
		const validationUrl = `${origin}/validasi/${trx.referenceNumber}`;
		const qrCodeBase64 = await QRCode.toDataURL(validationUrl);

		await db.update(transactions)
			.set({ status: 'COMPLETED', qrCodeBase64 })
			.where(eq(transactions.id, trx.id));

		return { success: true, message: 'Mutasi Stok Multi-item Selesai!' };
	}
};

