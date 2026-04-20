import { db } from '$lib/server/db';
import { transactions, transactionDetails, materials, ulps } from '$lib/server/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	
	// Only ADMIN_UP3 can access Usage Tracker
	if (!user || user.role !== 'ADMIN_UP3') {
		throw error(403, 'Akses ditolak. Halaman ini hanya untuk Admin UP3.');
	}

	// Fetch all transactions with type 'USAGE'
	const usageRows = await db.select({
		id: transactions.id,
		referenceNumber: transactions.referenceNumber,
		date: transactions.createdAt,
		targetUlp: ulps.name,
		takerName: transactions.takerName,
		usagePurpose: transactions.usagePurpose,
		materialName: materials.name,
		quantity: transactionDetails.quantity,
		description: transactionDetails.description,
		unit: materials.unit
	})
	.from(transactions)
	.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
	.leftJoin(ulps, eq(transactions.targetUlpId, ulps.id))
	.leftJoin(materials, eq(transactionDetails.materialId, materials.id))
	.where(eq(transactions.type, 'USAGE'))
	.orderBy(desc(transactions.createdAt))
	.limit(500);

	// Group rows by transaction
	const usageMap = new Map();
	usageRows.forEach(row => {
		if (!usageMap.has(row.id)) {
			usageMap.set(row.id, {
				id: row.id,
				referenceNumber: row.referenceNumber,
				date: row.date,
				ulpName: row.targetUlp,
				takerName: row.takerName,
				purpose: row.usagePurpose,
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

	// Fetch all ULPs for filtering
	const allUlps = await db.select().from(ulps);

	return {
		usageHistory: Array.from(usageMap.values()),
		ulps: allUlps
	};
};
