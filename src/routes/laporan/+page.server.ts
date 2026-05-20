import { db } from '$lib/server/db';
import { materials, transactions, transactionDetails, ulps } from '$lib/server/db/schema';
import { eq, and, lte, gte, lt, or, isNull, sum, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	
	const startDateStr = url.searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
	const endDateStr = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];
	const selectedUlpId = url.searchParams.get('ulpId') || (user?.role === 'ADMIN_UP3' ? 'up3' : user?.ulpId?.toString());

	const start = new Date(startDateStr);
	const end = new Date(endDateStr);
	end.setHours(23, 59, 59, 999);

	// Get all materials
	const allMaterials = await db.select().from(materials).orderBy(materials.name);
	const allUlps = await db.select().from(ulps);

	const reportData = [];

	for (const mat of allMaterials) {
		let awal = 0;
		let masuk = 0;
		let keluar = 0;

		// 1. Calculate Stok Awal (All transactions before startDate)
		// For UP3: INCOMING(+) - DISTRIBUTION(-)
		// For ULP: DISTRIBUTION(+) - USAGE(-)
		
		if (selectedUlpId === 'up3') {
			// UP3 Logic
			const [trxBefore] = await db.select({
				incoming: sql<number>`SUM(CASE WHEN ${transactions.type} = 'INCOMING' OR (${transactions.type} = 'INITIAL_STOCK' AND ${transactions.targetUlpId} IS NULL) THEN ${transactionDetails.quantity} ELSE 0 END)`,
				outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(and(
				eq(transactionDetails.materialId, mat.id),
				eq(transactions.status, 'COMPLETED'),
				or(
					lt(transactions.createdAt, start),
					eq(transactions.type, 'INITIAL_STOCK')
				)
			));

			awal = (trxBefore?.incoming || 0) - (trxBefore?.outgoing || 0);

			// 2. Masuk & Keluar in Period (Exclude INITIAL_STOCK from masuk)
			const [trxPeriod] = await db.select({
				incoming: sql<number>`SUM(CASE WHEN ${transactions.type} = 'INCOMING' THEN ${transactionDetails.quantity} ELSE 0 END)`,
				outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(and(
				eq(transactionDetails.materialId, mat.id),
				gte(transactions.createdAt, start),
				lte(transactions.createdAt, end),
				eq(transactions.status, 'COMPLETED')
			));

			masuk = Number(trxPeriod?.incoming || 0);
			keluar = Number(trxPeriod?.outgoing || 0);

		} else {
			// ULP Logic
			const ulpId = parseInt(selectedUlpId as string);
			
			const [trxBefore] = await db.select({
				incoming: sql<number>`SUM(CASE WHEN ${transactions.type} IN ('DISTRIBUTION', 'INITIAL_STOCK') THEN ${transactionDetails.quantity} ELSE 0 END)`,
				outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'USAGE' THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(and(
				eq(transactionDetails.materialId, mat.id),
				eq(transactions.status, 'COMPLETED'),
				eq(transactions.targetUlpId, ulpId),
				or(
					lt(transactions.createdAt, start),
					eq(transactions.type, 'INITIAL_STOCK')
				)
			));

			awal = (trxBefore?.incoming || 0) - (trxBefore?.outgoing || 0);

			// 2. Masuk & Keluar in Period (Exclude INITIAL_STOCK from masuk)
			const [trxPeriod] = await db.select({
				incoming: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' THEN ${transactionDetails.quantity} ELSE 0 END)`,
				outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'USAGE' THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(and(
				eq(transactionDetails.materialId, mat.id),
				gte(transactions.createdAt, start),
				lte(transactions.createdAt, end),
				eq(transactions.status, 'COMPLETED'),
				eq(transactions.targetUlpId, ulpId)
			));

			masuk = Number(trxPeriod?.incoming || 0);
			keluar = Number(trxPeriod?.outgoing || 0);
		}

		// Also make sure awal is parsed correctly, just in case
		awal = Number(awal);

		const akhir = awal + masuk - keluar;

		// Only include materials that have some activity or balance
		if (awal !== 0 || masuk !== 0 || keluar !== 0 || akhir !== 0) {
			reportData.push({
				id: mat.id,
				name: mat.name,
				unit: mat.unit,
				awal,
				masuk,
				keluar,
				akhir
			});
		}
	}

	return {
		reportData,
		allUlps,
		startDate: startDateStr,
		endDate: endDateStr,
		selectedUlpId,
		userRole: user?.role
	};
};
