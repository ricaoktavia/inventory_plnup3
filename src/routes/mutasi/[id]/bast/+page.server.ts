import { db } from '$lib/server/db';
import { transactions, transactionDetails, materials, ulps, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const trxId = parseInt(params.id);

	const [trx] = await db.select({
		ref: transactions.referenceNumber,
		date: transactions.createdAt,
		approvedDate: transactions.approvedAt,
		photo: transactions.photoBase64,
		qr: transactions.qrCodeBase64,
		status: transactions.status,
		targetUlp: ulps.name,
		takerName: transactions.takerName
	})
	.from(transactions)
	.leftJoin(ulps, eq(transactions.targetUlpId, ulps.id))
	.where(eq(transactions.id, trxId));

	if (!trx || trx.status !== 'COMPLETED') {
		throw error(404, 'Dokumen BAST belum siap atau tidak ditemukan.');
	}

	const details = await db.select({
		materialName: materials.name,
		quantity: transactionDetails.quantity,
		unit: materials.unit,
		description: transactionDetails.description
	})
	.from(transactionDetails)
	.innerJoin(materials, eq(transactionDetails.materialId, materials.id))
	.where(eq(transactionDetails.transactionId, trxId));

	return {
		trx,
		details
	};
};
