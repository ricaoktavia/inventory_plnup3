import { db } from '$lib/server/db';
import { transactions, transactionDetails, materials, ulps, stocks } from '$lib/server/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	
	if (!user || (user.role !== 'ADMIN_UP3' && user.role !== 'ADMIN_ULP')) {
		throw error(403, 'Akses ditolak.');
	}

	// Fetch all transactions with type 'USAGE'
	let query = db.select({
		id: transactions.id,
		referenceNumber: transactions.referenceNumber,
		date: transactions.createdAt,
		targetUlpId: transactions.targetUlpId,
		targetUlp: ulps.name,
		takerName: transactions.takerName,
		usagePurpose: transactions.usagePurpose,
		status: transactions.status,
		photo: transactions.photoBase64,
		materialName: materials.name,
		quantity: transactionDetails.quantity,
		description: transactionDetails.description,
		unit: materials.unit
	})
	.from(transactions)
	.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
	.leftJoin(ulps, eq(transactions.targetUlpId, ulps.id))
	.leftJoin(materials, eq(transactionDetails.materialId, materials.id))
	.where(eq(transactions.type, 'USAGE'));

	// Filter by ULP if role is ADMIN_ULP
	if (user.role === 'ADMIN_ULP') {
		query = query.where(and(eq(transactions.type, 'USAGE'), eq(transactions.targetUlpId, user.ulpId!)));
	}

	const usageRows = await query.orderBy(desc(transactions.createdAt)).limit(500);

	// Group rows by transaction
	const usageMap = new Map();
	usageRows.forEach(row => {
		if (!usageMap.has(row.id)) {
			usageMap.set(row.id, {
				id: row.id,
				referenceNumber: row.referenceNumber,
				date: row.date,
				targetUlpId: row.targetUlpId,
				ulpName: row.targetUlp,
				takerName: row.takerName,
				purpose: row.usagePurpose,
				status: row.status,
				photo: row.photo,
				items: []
			});
		}
		usageMap.get(row.id).items.push({
			name: row.materialName,
			quantity: row.quantity,
			unit: row.unit,
			description: row.description
		});
	});

	// Fetch all ULPs for filtering (only needed by UP3)
	const allUlps = user.role === 'ADMIN_UP3' ? await db.select().from(ulps) : [];

	return {
		usageHistory: Array.from(usageMap.values()),
		ulps: allUlps,
		userRole: user.role,
		userUlpId: user.ulpId
	};
};

export const actions: Actions = {
	finalisasiDraft: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		const photoBase64 = formData.get('photoBase64') as string;

		if (!trxId || !photoBase64) return fail(400, { error: 'Lengkapi data dan foto bukti!' });

		const id = parseInt(trxId);
		
		// 1. Get Transaction Details
		const details = await db.select().from(transactionDetails).where(eq(transactionDetails.transactionId, id));
		
		// 2. Transaksi Potong Stok
		try {
			await db.transaction(async (tx) => {
				for (const d of details) {
					const [currentStock] = await tx.select().from(stocks).where(and(eq(stocks.materialId, d.materialId), eq(stocks.ulpId, user.ulpId!)));
					
					if (!currentStock || currentStock.quantity < d.quantity) {
						const [mat] = await tx.select().from(materials).where(eq(materials.id, d.materialId));
						throw new Error(`Stok ${mat?.name} tidak cukup.`);
					}
					
					await tx.update(stocks).set({ quantity: sql`quantity - ${d.quantity}` }).where(eq(stocks.id, currentStock.id));
				}

				// 3. Update Transaction status
				await tx.update(transactions).set({
					status: 'COMPLETED',
					photoBase64: photoBase64,
					approvedAt: new Date()
				}).where(and(eq(transactions.id, id), eq(transactions.targetUlpId, user.ulpId!)));
			});
			
			return { success: true, message: 'Draf Pemakaian Berhasil Difinalisasi! Stok telah terpotong.' };
		} catch (err: any) {
			return fail(400, { error: err.message });
		}
	}
};
