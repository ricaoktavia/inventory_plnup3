import { db } from '$lib/server/db';
import { transactions, transactionDetails, materials, ulps, stocks } from '$lib/server/db/schema';
import { desc, eq, and, sql, isNull } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import QRCode from 'qrcode';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	
	if (!user || (user.role !== 'ADMIN_UP3' && user.role !== 'ADMIN_ULP')) {
		throw error(403, 'Akses ditolak.');
	}

	// Fetch all transactions (DISTRIBUTION, USAGE, INITIAL_STOCK)
	let query = db.select({
		id: transactions.id,
		referenceNumber: transactions.referenceNumber,
		date: transactions.createdAt,
		targetUlpId: transactions.targetUlpId,
		targetUlp: ulps.name,
		status: transactions.status,
		type: transactions.type,
		takerName: transactions.takerName,
		usagePurpose: transactions.usagePurpose,
		requestLetter: transactions.requestLetterBase64,
		photo: transactions.photoBase64,
		firstParty: transactions.firstParty,
		materialName: materials.name,
		quantity: transactionDetails.quantity,
		description: transactionDetails.description,
		unit: materials.unit
	})
	.from(transactions)
	.leftJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
	.leftJoin(ulps, eq(transactions.targetUlpId, ulps.id))
	.leftJoin(materials, eq(transactionDetails.materialId, materials.id));

	// Filter by ULP if role is ADMIN_ULP
	if (user.role === 'ADMIN_ULP') {
		query = (query as any).where(eq(transactions.targetUlpId, user.ulpId!));
	}

	const historyRows = await query.orderBy(desc(transactions.createdAt)).limit(500);

	// Group rows by transaction
	const historyMap = new Map();
	historyRows.forEach(row => {
		if (!historyMap.has(row.id)) {
			historyMap.set(row.id, {
				id: row.id,
				referenceNumber: row.referenceNumber,
				date: row.date,
				targetUlpId: row.targetUlpId,
				ulpName: row.targetUlp || 'Pusat UP3',
				status: row.status,
				type: row.type,
				takerName: row.takerName,
				purpose: row.usagePurpose,
				requestLetter: row.requestLetter,
				photo: row.photo,
				firstParty: row.firstParty,
				items: []
			});
		}
		if (row.materialName) {
			historyMap.get(row.id).items.push({
				name: row.materialName,
				quantity: row.quantity,
				unit: row.unit,
				description: row.description
			});
		}
	});

	// Fetch all ULPs for filtering (only needed by UP3)
	const allUlps = user.role === 'ADMIN_UP3' ? await db.select().from(ulps) : [];

	return {
		usageHistory: Array.from(historyMap.values()),
		ulps: allUlps,
		userRole: user.role,
		userUlpId: user.ulpId
	};
};

export const actions: Actions = {
	// (ULP & UP3) Finalisasi Pemakaian Lapangan + Potong Stok
	finalisasiPemakaian: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP' && user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		const photoBase64 = formData.get('photoBase64') as string;

		if (!trxId) return fail(400, { error: 'Pilih draf pemakaian!' });

		const id = parseInt(trxId);
		const [trx] = await db.select().from(transactions).where(eq(transactions.id, id));
		if (!trx) return fail(404, { error: 'Transaksi tidak ditemukan.' });

		// If ULP usage (targetUlpId is not null), photo is mandatory!
		if (trx.targetUlpId !== null && !photoBase64) {
			return fail(400, { error: 'Foto bukti (eviden) wajib diunggah untuk pemakaian ULP.' });
		}

		const details = await db.select().from(transactionDetails).where(eq(transactionDetails.transactionId, id));
		
		// Validasi Stok dan Potong Stok
		for (const d of details) {
			const stockCondition = user.role === 'ADMIN_UP3' ? isNull(stocks.ulpId) : eq(stocks.ulpId, user.ulpId!);
			const [currentStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, d.materialId), stockCondition));
			if (!currentStock || currentStock.quantity < d.quantity) {
				const [mat] = await db.select().from(materials).where(eq(materials.id, d.materialId));
				return fail(400, { error: `Gagal! Stok ${mat?.name} tidak cukup.` });
			}
			await db.update(stocks).set({ quantity: sql`quantity - ${d.quantity}` }).where(eq(stocks.id, currentStock.id));
		}

		await db.update(transactions).set({
			status: 'COMPLETED',
			photoBase64: photoBase64 || null
		}).where(eq(transactions.id, id));

		return { success: true, message: 'Pemakaian Lapangan Selesai! Stok telah terpotong.' };
	},

	// (UP3) Finalisasi Transfer Ke ULP
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
			return fail(400, { error: 'Detail transaksi transfer tidak ditemukan.' });
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

		// Generate QR Code dengan format teks informatif seperti PLN AMS
		const origin = new URL(request.url).origin;
		const validationUrl = `${origin}/validasi/${trx.referenceNumber}`;
		const [targetUlpData] = await db.select({ name: ulps.name }).from(ulps).where(eq(ulps.id, trx.targetUlpId!));
		const ulpNameFin = targetUlpData?.name || 'ULP';
		const firstPartyNameFin = (trx.firstParty || 'NANANG DARYANTO').toUpperCase();
		const qrContent = `UP3 MADURA - ${firstPartyNameFin}\nNo.BAST: ${trx.referenceNumber}\nPenerima: ${trx.takerName} - ULP ${ulpNameFin}\nDokumen ini diproduksi oleh ${validationUrl}`;
		const qrCodeBase64 = await QRCode.toDataURL(qrContent, { errorCorrectionLevel: 'M', margin: 2 });

		await db.update(transactions)
			.set({ status: 'COMPLETED', qrCodeBase64 })
			.where(eq(transactions.id, trx.id));

		return { success: true, message: 'Mutasi Stok Multi-item Selesai!' };
	},

	// (UP3) Konfirmasi Stok Awal
	konfirmasiStokAwal: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		if (!trxId) return fail(400, { error: 'ID Transaksi tidak valid.' });

		const [trx] = await db.select().from(transactions).where(eq(transactions.id, parseInt(trxId)));
		if (!trx || trx.status !== 'REQUESTED' || trx.type !== 'INITIAL_STOCK') {
			return fail(400, { error: 'Transaksi tidak valid.' });
		}

		const details = await db.select().from(transactionDetails).where(eq(transactionDetails.transactionId, trx.id));
		if (details.length === 0) {
			return fail(400, { error: 'Detail transaksi stok awal tidak ditemukan.' });
		}

		// Update or Insert Stok ULP
		for (const detail of details) {
			const [ulpStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, detail.materialId), eq(stocks.ulpId, trx.targetUlpId!)));
			
			if (ulpStock) {
				await db.update(stocks)
					.set({ quantity: detail.quantity }) // Set to exactly what was inputted
					.where(eq(stocks.id, ulpStock.id));
			} else {
				await db.insert(stocks).values({
					materialId: detail.materialId,
					ulpId: trx.targetUlpId!,
					quantity: detail.quantity
				});
			}
		}

		await db.update(transactions)
			.set({ status: 'COMPLETED', approvedAt: new Date() })
			.where(eq(transactions.id, trx.id));

		return { success: true, message: 'Stok Awal Berhasil Dikonfirmasi! Stok ULP telah diperbarui.' };
	},

	// (UP3) Tolak Stok Awal
	tolakStokAwal: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		if (!trxId) return fail(400, { error: 'ID Transaksi tidak valid.' });

		const [trx] = await db.select().from(transactions).where(eq(transactions.id, parseInt(trxId)));
		if (!trx || trx.status !== 'REQUESTED' || trx.type !== 'INITIAL_STOCK') {
			return fail(400, { error: 'Transaksi tidak valid.' });
		}

		await db.update(transactions)
			.set({ status: 'REJECTED' })
			.where(eq(transactions.id, trx.id));

		return { success: true, message: 'Stok Awal ULP telah ditolak. ULP dapat mengajukan ulang.' };
	}
};
