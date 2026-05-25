import { db } from '$lib/server/db';
import { materials, transactions, transactionDetails, ulps } from '$lib/server/db/schema';
import { eq, and, lte, gte, lt, or, isNull, sum, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	
	const startDateStr = url.searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
	const endDateStr = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];
	const selectedUlpId = url.searchParams.get('ulpId') || (user?.role === 'ADMIN_UP3' ? 'up3' : user?.ulpId?.toString()) || 'up3';

	const currentYear = new Date().getFullYear();
	const selectedYearStr = url.searchParams.get('year') || currentYear.toString();
	const year = parseInt(selectedYearStr) || currentYear;

	const yearsList = [];
	for (let y = currentYear - 3; y <= currentYear + 3; y++) {
		yearsList.push(y);
	}

	const activeTab = url.searchParams.get('tab') || 'MUTASI';

	const start = new Date(startDateStr);
	const end = new Date(endDateStr);
	end.setHours(23, 59, 59, 999);

	// Get all materials
	const allMaterials = await db.select().from(materials).orderBy(materials.name);
	const allUlps = await db.select().from(ulps);

	const reportData = [];

	let beforeRows = [];
	let periodRows = [];

	if (selectedUlpId === 'up3') {
		// UP3 Logic
		beforeRows = await db.select({
			materialId: transactionDetails.materialId,
			incoming: sql<number>`SUM(CASE WHEN ${transactions.type} = 'INCOMING' OR (${transactions.type} = 'INITIAL_STOCK' AND ${transactions.targetUlpId} IS NULL) THEN ${transactionDetails.quantity} ELSE 0 END)`,
			outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' THEN ${transactionDetails.quantity} ELSE 0 END)`
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.where(and(
			eq(transactions.status, 'COMPLETED'),
			or(
				lt(transactions.createdAt, start),
				eq(transactions.type, 'INITIAL_STOCK')
			)
		))
		.groupBy(transactionDetails.materialId);

		periodRows = await db.select({
			materialId: transactionDetails.materialId,
			incoming: sql<number>`SUM(CASE WHEN ${transactions.type} = 'INCOMING' THEN ${transactionDetails.quantity} ELSE 0 END)`,
			outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' THEN ${transactionDetails.quantity} ELSE 0 END)`
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.where(and(
			gte(transactions.createdAt, start),
			lte(transactions.createdAt, end),
			eq(transactions.status, 'COMPLETED')
		))
		.groupBy(transactionDetails.materialId);
	} else {
		// ULP Logic
		const ulpId = parseInt(selectedUlpId as string);

		beforeRows = await db.select({
			materialId: transactionDetails.materialId,
			incoming: sql<number>`SUM(CASE WHEN ${transactions.type} IN ('DISTRIBUTION', 'INITIAL_STOCK') THEN ${transactionDetails.quantity} ELSE 0 END)`,
			outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'USAGE' THEN ${transactionDetails.quantity} ELSE 0 END)`
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.where(and(
			eq(transactions.status, 'COMPLETED'),
			eq(transactions.targetUlpId, ulpId),
			or(
				lt(transactions.createdAt, start),
				eq(transactions.type, 'INITIAL_STOCK')
			)
		))
		.groupBy(transactionDetails.materialId);

		periodRows = await db.select({
			materialId: transactionDetails.materialId,
			incoming: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' THEN ${transactionDetails.quantity} ELSE 0 END)`,
			outgoing: sql<number>`SUM(CASE WHEN ${transactions.type} = 'USAGE' THEN ${transactionDetails.quantity} ELSE 0 END)`
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.where(and(
			gte(transactions.createdAt, start),
			lte(transactions.createdAt, end),
			eq(transactions.status, 'COMPLETED'),
			eq(transactions.targetUlpId, ulpId)
		))
		.groupBy(transactionDetails.materialId);
	}

	const beforeMap = new Map();
	beforeRows.forEach(row => {
		beforeMap.set(row.materialId, {
			incoming: Number(row.incoming || 0),
			outgoing: Number(row.outgoing || 0)
		});
	});

	const periodMap = new Map();
	periodRows.forEach(row => {
		periodMap.set(row.materialId, {
			incoming: Number(row.incoming || 0),
			outgoing: Number(row.outgoing || 0)
		});
	});

	for (const mat of allMaterials) {
		const before = beforeMap.get(mat.id) || { incoming: 0, outgoing: 0 };
		const period = periodMap.get(mat.id) || { incoming: 0, outgoing: 0 };

		const awal = before.incoming - before.outgoing;
		const masuk = period.incoming;
		const keluar = period.outgoing;
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

	// Calculate monthly usage trends (for Jan-Dec of current year)
	const conditions = [
		eq(transactions.type, 'USAGE'),
		eq(transactions.status, 'COMPLETED'),
		sql`YEAR(${transactions.createdAt}) = ${year}`
	];

	if (selectedUlpId === 'up3') {
		conditions.push(isNull(transactions.targetUlpId));
	} else {
		conditions.push(eq(transactions.targetUlpId, parseInt(selectedUlpId || '')));
	}

	const usageRows = await db.select({
		materialId: transactionDetails.materialId,
		month: sql<number>`MONTH(${transactions.createdAt})`,
		totalQty: sql<number>`SUM(${transactionDetails.quantity})`
	})
	.from(transactions)
	.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
	.where(and(...conditions))
	.groupBy(transactionDetails.materialId, sql`MONTH(${transactions.createdAt})`);

	const monthlyUsageMap = new Map();
	usageRows.forEach(row => {
		const matId = row.materialId;
		const month = Number(row.month);
		const qty = Number(row.totalQty || 0);
		if (!monthlyUsageMap.has(matId)) {
			monthlyUsageMap.set(matId, {});
		}
		monthlyUsageMap.get(matId)[month] = qty;
	});

	const monthlyUsageData = [];
	for (const mat of allMaterials) {
		const monthsObj = monthlyUsageMap.get(mat.id) || {};
		let total = 0;
		const monthlyValues = [];
		for (let m = 1; m <= 12; m++) {
			const val = monthsObj[m] || 0;
			monthlyValues.push(val);
			total += val;
		}
		
		const avg = Number((total / 12).toFixed(2));
		
		if (total > 0) {
			monthlyUsageData.push({
				id: mat.id,
				name: mat.name,
				unit: mat.unit,
				months: monthlyValues,
				total,
				avg
			});
		}
	}

	return {
		reportData,
		monthlyUsageData,
		currentYear: year,
		yearsList,
		activeTab,
		allUlps,
		startDate: startDateStr,
		endDate: endDateStr,
		selectedUlpId,
		userRole: user?.role
	};
};
