import { db } from '$lib/server/db';
import { transactions, transactionDetails, materials, ulps } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	if (!user || (user.role !== 'ADMIN_UP3' && user.role !== 'ADMIN_ULP')) {
		throw error(403, 'Akses ditolak.');
	}

	// Fetch all transactions (DISTRIBUTION, USAGE, INITIAL_STOCK)
	let query = db
		.select({
			id: transactions.id,
			referenceNumber: transactions.referenceNumber,
			date: transactions.createdAt,
			targetUlpId: transactions.targetUlpId,
			targetUlp: ulps.name,
			status: transactions.status,
			type: transactions.type,
			takerName: transactions.takerName,
			usagePurpose: transactions.usagePurpose,
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

	// Query more rows (up to 10000) for exporting
	const historyRows = await query.orderBy(desc(transactions.createdAt)).limit(10000);

	// Group rows by transaction
	const historyMap = new Map();
	historyRows.forEach((row) => {
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
