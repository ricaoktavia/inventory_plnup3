import { db } from '$lib/server/db';
import { materials, stocks, ulps, transactions, transactionDetails } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { desc, eq, and, isNull, sql, asc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	
	const selectedUlpId = url.searchParams.get('ulpId') || (user?.role === 'ADMIN_UP3' ? 'rekap' : user?.ulpId?.toString());
	
	const allUlps = await db.select().from(ulps).orderBy(asc(ulps.name));
	const allMaterials = await db.select().from(materials).orderBy(materials.id);
	
	// Fetch ALL stocks for matrix view
	const allStocks = await db.select().from(stocks);
	const stockMatrix: Record<number, Record<string, number>> = {};
	
	allMaterials.forEach(m => {
		stockMatrix[m.id] = { 'up3': 0 };
		allUlps.forEach(u => stockMatrix[m.id][u.id.toString()] = 0);
	});
	
	allStocks.forEach(s => {
		const key = s.ulpId ? s.ulpId.toString() : 'up3';
		if (stockMatrix[s.materialId]) {
			stockMatrix[s.materialId][key] = s.quantity;
		}
	});

	let displayUlpName = 'Seluruh Unit';
	if (selectedUlpId === 'up3') displayUlpName = 'Pusat UP3';
	else if (selectedUlpId && selectedUlpId !== 'rekap') {
		const found = allUlps.find(u => u.id.toString() === selectedUlpId);
		if (found) displayUlpName = `ULP ${found.name}`;
	}

	return {
		materials: allMaterials,
		stockMatrix,
		allUlps,
		userRole: user?.role,
		selectedUlpId,
		ulpName: displayUlpName
	};
};

export const actions: Actions = {
	tambah: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Hanya Admin UP3 yang dapat menambah material.' });

		const data = await request.formData();
		const name = data.get('nama') as string;
		const unit = data.get('satuan') as string;
		const desc = data.get('deskripsi') as string;
		const quantityStr = data.get('jumlah') as string;
		const ulpIdStr = data.get('ulpId') as string; // 'up3' or ULP ID
		const quantity = parseInt(quantityStr || '0');

		if (!name || !unit) return fail(400, { error: 'Nama material dan satuan wajib diisi.' });
		if (isNaN(quantity) || quantity < 0) return fail(400, { error: 'Stok awal tidak valid.' });

		// Insert new material
		const [insertMat] = await db.insert(materials).values({ name, unit, description: desc });
		const materialId = insertMat.insertId;

		const targetUlpIdVal = ulpIdStr && ulpIdStr !== 'up3' ? parseInt(ulpIdStr) : null;

		// Create stock record
		await db.insert(stocks).values({
			materialId: materialId,
			ulpId: targetUlpIdVal,
			quantity: quantity
		});

		if (quantity > 0) {
			// Record transaction
			const ref = `INC-${Date.now()}`;
			const [insertTrx] = await db.insert(transactions).values({
				referenceNumber: ref,
				type: targetUlpIdVal ? 'INITIAL_STOCK' : 'INCOMING',
				status: 'COMPLETED',
				targetUlpId: targetUlpIdVal,
				createdBy: user.id
			});

			await db.insert(transactionDetails).values({
				transactionId: insertTrx.insertId,
				materialId: materialId,
				quantity: quantity,
				description: 'Penerimaan / Stok Awal Material Baru'
			});
		}

		return { success: true, message: 'Katalog material baru berhasil ditambahkan!' };
	},

	edit: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Hanya Admin UP3 yang dapat mengedit.' });

		const data = await request.formData();
		const materialId = parseInt(data.get('materialId') as string);
		const name = data.get('nama') as string;
		const unit = data.get('satuan') as string;
		const quantityStr = data.get('stok') as string;
		const ulpIdStr = data.get('ulpId') as string; // 'up3' or ULP ID

		if (!materialId || !name || !unit || quantityStr === undefined) return fail(400, { error: 'Data edit tidak valid.' });

		const quantity = parseInt(quantityStr);
		if (isNaN(quantity) || quantity < 0) return fail(400, { error: 'Stok tidak boleh negatif.' });

		// 1. Update material name and unit
		await db.update(materials).set({ name, unit }).where(eq(materials.id, materialId));

		// 2. Update stock quantity for this specific warehouse
		const targetUlpIdVal = ulpIdStr && ulpIdStr !== 'up3' ? parseInt(ulpIdStr) : null;
		
		const [existingStock] = await db.select().from(stocks).where(and(
			eq(stocks.materialId, materialId),
			targetUlpIdVal ? eq(stocks.ulpId, targetUlpIdVal) : isNull(stocks.ulpId)
		));

		const oldQty = existingStock ? existingStock.quantity : 0;

		if (existingStock) {
			await db.update(stocks)
				.set({ quantity })
				.where(eq(stocks.id, existingStock.id));
		} else {
			await db.insert(stocks).values({
				materialId,
				ulpId: targetUlpIdVal,
				quantity
			});
		}

		// 3. Record transaction if quantity has increased
		if (quantity > oldQty) {
			const diff = quantity - oldQty;
			const ref = `INC-${Date.now()}`;
			const [insertTrx] = await db.insert(transactions).values({
				referenceNumber: ref,
				type: targetUlpIdVal ? 'INITIAL_STOCK' : 'INCOMING',
				status: 'COMPLETED',
				targetUlpId: targetUlpIdVal,
				createdBy: user.id
			});

			await db.insert(transactionDetails).values({
				transactionId: insertTrx.insertId,
				materialId: materialId,
				quantity: diff,
				description: `Penyesuaian Stok (Koreksi Tambah dari ${oldQty} menjadi ${quantity})`
			});
		}

		return { success: true, message: 'Katalog material dan stok berhasil diperbarui!' };
	},

	hapus: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Hanya Admin UP3 yang dapat menghapus.' });

		const data = await request.formData();
		const materialId = parseInt(data.get('materialId') as string);
		if (!materialId) return fail(400, { error: 'ID tidak valid.' });

		try {
			// Clean up stock entries
			await db.delete(stocks).where(eq(stocks.materialId, materialId));
			
			// Delete material
			await db.delete(materials).where(eq(materials.id, materialId));
			return { success: true, message: 'Material berhasil dihapus secara permanen.' };
		} catch (error: any) {
			// Foreign key constraint violation
			return fail(400, { error: 'Gagal dihapus: Material ini masih terikat pada riwayat Transaksi mutasi.' });
		}
	}
};
