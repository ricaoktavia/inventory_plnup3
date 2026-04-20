import { db } from '$lib/server/db';
import { transactions, transactionDetails, materials, ulps } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const refNumber = params.ref;

	const [trx] = await db.select({
		id: transactions.id,
		ref: transactions.referenceNumber,
		date: transactions.createdAt,
		approvedDate: transactions.approvedAt,
		photo: transactions.photoBase64,
		status: transactions.status,
		targetUlp: ulps.name,
		takerName: transactions.takerName
	})
	.from(transactions)
	.leftJoin(ulps, eq(transactions.targetUlpId, ulps.id))
	.where(eq(transactions.referenceNumber, refNumber));

	if (!trx || trx.status !== 'COMPLETED') {
		throw error(404, 'Dokumen BAST tidak valid atau belum dirilis resmi.');
	}

	const details = await db.select({
		materialName: materials.name,
		quantity: transactionDetails.quantity,
		unit: materials.unit
	})
	.from(transactionDetails)
	.innerJoin(materials, eq(transactionDetails.materialId, materials.id))
	.where(eq(transactionDetails.transactionId, trx.id));

	return {
		trx,
		details
	};
};
