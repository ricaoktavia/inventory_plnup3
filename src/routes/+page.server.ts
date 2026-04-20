import { db } from '$lib/server/db';
import { materials, stocks, transactions, transactionDetails, ulps } from '$lib/server/db/schema';
import { desc, eq, and, sql, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) return {};

	const isUP3 = user.role === 'ADMIN_UP3';
	const userLocationCondition = isUP3 ? isNull(stocks.ulpId) : eq(stocks.ulpId, user.ulpId!);

	// 1. Critical Stocks Fetch (< 100)
	const criticalStocks = await db.select({
		id: materials.id,
		name: materials.name,
		quantity: stocks.quantity,
		unit: materials.unit
	})
	.from(stocks)
	.innerJoin(materials, eq(stocks.materialId, materials.id))
	.where(and(userLocationCondition, sql`quantity < 100`))
	.limit(5);

	// 2. Pending Actions (Drafts waiting for ULP)
	let pendingDraftsCount = 0;
	if (!isUP3) {
		const pendingQ = await db.select({ count: sql`count(*)` })
			.from(transactions)
			.where(and(eq(transactions.targetUlpId, user.ulpId!), eq(transactions.status, 'DRAFT')));
		pendingDraftsCount = Number(pendingQ[0].count);
	}

	// 3. KPI Calculations
	const totalMatResult = await db.select({ count: sql`count(*)` }).from(materials);
	const totalMaterials = Number(totalMatResult[0].count);

	// Get transactions made this month (or total for simplicity)
	const mutasiKeluarQuery = isUP3 
		? eq(transactions.type, 'DISTRIBUTION')
		: and(eq(transactions.type, 'USAGE'), eq(transactions.targetUlpId, user.ulpId!));
		
	const mutasiKeluarResult = await db.select({ count: sql`count(*)` }).from(transactions).where(mutasiKeluarQuery);
	const mutasiKeluar = Number(mutasiKeluarResult[0].count);

	// 4. Top 5 Fast Moving Materials (based on transaction details)
	const top5Query = await db.select({
		name: materials.name,
		total: sql<number>`sum(${transactionDetails.quantity})`
	})
	.from(transactionDetails)
	.innerJoin(transactions, eq(transactionDetails.transactionId, transactions.id))
	.innerJoin(materials, eq(transactionDetails.materialId, materials.id))
	.where(mutasiKeluarQuery) // Grouped by user location context
	.groupBy(materials.id)
	.orderBy(desc(sql`sum(${transactionDetails.quantity})`))
	.limit(5);

	// Normalize top5 total values for proportional bar chart (max 100%)
	const maxTop5Value = top5Query.length > 0 ? Math.max(...top5Query.map(t => Number(t.total))) : 1;
	const top5Materials = top5Query.map(t => ({
		name: t.name,
		total: Number(t.total),
		percentage: Math.max((Number(t.total) / maxTop5Value) * 100, 5) // at least 5% height
	}));

	// 5. Recent Logs (Histori Transaksi Terakhir)
	const recentLogsCondition = isUP3 ? undefined : eq(transactions.targetUlpId, user.ulpId!);
	const logsQuery = db.select({
		ref: transactions.referenceNumber,
		date: transactions.createdAt,
		type: transactions.type,
		status: transactions.status,
		takerName: transactions.takerName,
		ulpName: ulps.name
	})
	.from(transactions)
	.leftJoin(ulps, eq(transactions.targetUlpId, ulps.id));

	if (recentLogsCondition) {
		logsQuery.where(recentLogsCondition);
	}

	const recentLogs = await logsQuery.orderBy(desc(transactions.createdAt)).limit(5);

	return {
		role: user.role,
		ulpName: user.ulpName,
		criticalStocks,
		pendingDraftsCount,
		kpi: {
			totalMaterials,
			mutasiKeluar
		},
		top5Materials,
		recentLogs
	};
};
