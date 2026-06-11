import { db } from '$lib/server/db';
import { materials, transactions, transactionDetails, ulps, stocks } from '$lib/server/db/schema';
import { eq, and, lte, gte, gt, or, isNull, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;

	const startDateStr =
		url.searchParams.get('startDate') ||
		new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
	const endDateStr = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];
	const selectedUlpId =
		url.searchParams.get('ulpId') ||
		(user?.role === 'ADMIN_UP3' ? 'up3' : user?.ulpId?.toString()) ||
		'up3';

	const currentYear = new Date().getFullYear();
	const selectedYearStr = url.searchParams.get('year') || currentYear.toString();
	const year = parseInt(selectedYearStr) || currentYear;

	const yearsList: number[] = [];
	for (let y = currentYear - 3; y <= currentYear + 3; y++) {
		yearsList.push(y);
	}

	const activeTab = url.searchParams.get('tab') || 'MUTASI';

	const start = new Date(startDateStr);
	const end = new Date(endDateStr);
	end.setHours(23, 59, 59, 999);

	const allMaterials = await db.select().from(materials).orderBy(materials.name);
	const allUlps = await db.select().from(ulps);

	// ============================================================
	// PENDEKATAN: BACKWARD CALCULATION dari currentStock
	// ============================================================
	// Tabel `stocks` SELALU akurat (diupdate atomik setiap transaksi).
	// Termasuk INITIAL_STOCK yang langsung SET nilai stok di tabel ini.
	//
	// Rumus backward:
	//   stok_akhir_periode = currentStock + keluar_pasca_periode - masuk_pasca_periode
	//   stok_awal_periode  = stok_akhir_periode - masuk_periode + keluar_periode
	//
	// Tidak perlu menangani INITIAL_STOCK secara khusus sama sekali.
	// ============================================================

	// 1. Stok saat ini (dari tabel stocks — sumber kebenaran)
	const currentStocks = await db
		.select()
		.from(stocks)
		.where(
			selectedUlpId === 'up3' ? isNull(stocks.ulpId) : eq(stocks.ulpId, parseInt(selectedUlpId))
		);

	const currentStockMap = new Map<number, number>();
	currentStocks.forEach((row) => {
		currentStockMap.set(row.materialId, Number(row.quantity || 0));
	});

	// 2. Transaksi IN periode & SETELAH periode
	let periodRows: { materialId: number; masuk: number; keluar: number }[] = [];
	let afterRows: { materialId: number; masuk: number; keluar: number }[] = [];

	if (selectedUlpId === 'up3') {
		// UP3: masuk = INCOMING, keluar = DISTRIBUTION (ke ULP) + USAGE (tanpa target ULP)
		periodRows = await db
			.select({
				materialId: transactionDetails.materialId,
				masuk: sql<number>`SUM(CASE WHEN ${transactions.type} = 'INCOMING' THEN ${transactionDetails.quantity} ELSE 0 END)`,
				keluar: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' OR (${transactions.type} = 'USAGE' AND ${transactions.targetUlpId} IS NULL) THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(
				and(
					gte(transactions.createdAt, start),
					lte(transactions.createdAt, end),
					eq(transactions.status, 'COMPLETED'),
					or(isNull(transactions.targetUlpId), eq(transactions.type, 'DISTRIBUTION'))
				)
			)
			.groupBy(transactionDetails.materialId);

		afterRows = await db
			.select({
				materialId: transactionDetails.materialId,
				masuk: sql<number>`SUM(CASE WHEN ${transactions.type} = 'INCOMING' THEN ${transactionDetails.quantity} ELSE 0 END)`,
				keluar: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' OR (${transactions.type} = 'USAGE' AND ${transactions.targetUlpId} IS NULL) THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(
				and(
					gt(transactions.createdAt, end),
					eq(transactions.status, 'COMPLETED'),
					or(isNull(transactions.targetUlpId), eq(transactions.type, 'DISTRIBUTION'))
				)
			)
			.groupBy(transactionDetails.materialId);
	} else {
		// ULP: masuk = DISTRIBUTION dari UP3 ke ULP ini, keluar = USAGE oleh ULP ini
		const ulpId = parseInt(selectedUlpId as string);

		periodRows = await db
			.select({
				materialId: transactionDetails.materialId,
				masuk: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' AND ${transactions.status} = 'COMPLETED' THEN ${transactionDetails.quantity} ELSE 0 END)`,
				keluar: sql<number>`SUM(CASE WHEN ${transactions.type} = 'USAGE' AND ${transactions.status} = 'COMPLETED' THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(
				and(
					gte(transactions.createdAt, start),
					lte(transactions.createdAt, end),
					eq(transactions.targetUlpId, ulpId)
				)
			)
			.groupBy(transactionDetails.materialId);

		afterRows = await db
			.select({
				materialId: transactionDetails.materialId,
				masuk: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DISTRIBUTION' AND ${transactions.status} = 'COMPLETED' THEN ${transactionDetails.quantity} ELSE 0 END)`,
				keluar: sql<number>`SUM(CASE WHEN ${transactions.type} = 'USAGE' AND ${transactions.status} = 'COMPLETED' THEN ${transactionDetails.quantity} ELSE 0 END)`
			})
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(and(gt(transactions.createdAt, end), eq(transactions.targetUlpId, ulpId)))
			.groupBy(transactionDetails.materialId);
	}

	const periodMap = new Map<number, { masuk: number; keluar: number }>();
	periodRows.forEach((row) => {
		periodMap.set(row.materialId, {
			masuk: Number(row.masuk || 0),
			keluar: Number(row.keluar || 0)
		});
	});

	const afterMap = new Map<number, { masuk: number; keluar: number }>();
	afterRows.forEach((row) => {
		afterMap.set(row.materialId, {
			masuk: Number(row.masuk || 0),
			keluar: Number(row.keluar || 0)
		});
	});

	// Kumpulkan semua materialId yang relevan
	const relevantMaterialIds = new Set<number>([
		...currentStockMap.keys(),
		...periodMap.keys(),
		...afterMap.keys()
	]);

	const reportData: {
		id: number;
		name: string;
		unit: string;
		awal: number;
		masuk: number;
		keluar: number;
		akhir: number;
	}[] = [];

	for (const mat of allMaterials) {
		if (!relevantMaterialIds.has(mat.id)) continue;

		const currentStock = currentStockMap.get(mat.id) || 0;
		const period = periodMap.get(mat.id) || { masuk: 0, keluar: 0 };
		const after = afterMap.get(mat.id) || { masuk: 0, keluar: 0 };

		// stok_akhir_periode = stok_sekarang + keluar_pasca_periode - masuk_pasca_periode
		const akhir = currentStock + after.keluar - after.masuk;

		// stok_awal = stok_akhir - masuk_dalam_periode + keluar_dalam_periode
		const masuk = period.masuk;
		const keluar = period.keluar;
		const awal = akhir - masuk + keluar;

		if (awal !== 0 || masuk !== 0 || keluar !== 0 || akhir !== 0 || currentStock !== 0) {
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

	// Tren pemakaian bulanan (Jan–Des)
	const conditions: ReturnType<typeof eq>[] = [
		eq(transactions.type, 'USAGE'),
		eq(transactions.status, 'COMPLETED'),
		sql`YEAR(${transactions.createdAt}) = ${year}` as any
	];

	if (selectedUlpId === 'up3') {
		conditions.push(isNull(transactions.targetUlpId) as any);
	} else {
		conditions.push(eq(transactions.targetUlpId, parseInt(selectedUlpId || '')) as any);
	}

	const usageRows = await db
		.select({
			materialId: transactionDetails.materialId,
			month: sql<number>`MONTH(${transactions.createdAt})`,
			totalQty: sql<number>`SUM(${transactionDetails.quantity})`
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.where(and(...conditions))
		.groupBy(transactionDetails.materialId, sql`MONTH(${transactions.createdAt})`);

	const monthlyUsageMap = new Map<number, Record<number, number>>();
	usageRows.forEach((row) => {
		const matId = row.materialId;
		const month = Number(row.month);
		const qty = Number(row.totalQty || 0);
		if (!monthlyUsageMap.has(matId)) {
			monthlyUsageMap.set(matId, {});
		}
		monthlyUsageMap.get(matId)![month] = qty;
	});

	const monthlyUsageData: {
		id: number;
		name: string;
		unit: string;
		months: number[];
		total: number;
		avg: number;
	}[] = [];

	for (const mat of allMaterials) {
		const monthsObj = monthlyUsageMap.get(mat.id) || {};
		let total = 0;
		const monthlyValues: number[] = [];
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
