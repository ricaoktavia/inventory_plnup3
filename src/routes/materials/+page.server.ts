import { db } from '$lib/server/db';
import { materials, stocks, ulps, transactions, transactionDetails } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { desc, eq, and, isNull, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	
	let condition;
	let selectedUlpId = url.searchParams.get('ulpId');
	let displayUlpName = 'Pusat UP3';

	let allUlps: any[] = [];

	if (user?.role === 'ADMIN_UP3') {
		allUlps = await db.select().from(ulps);
		
		if (selectedUlpId && selectedUlpId !== 'up3') {
			condition = eq(stocks.ulpId, parseInt(selectedUlpId));
			const selectedUlp = allUlps.find(u => u.id === parseInt(selectedUlpId as string));
			if (selectedUlp) displayUlpName = `ULP ${selectedUlp.name}`;
		} else {
			condition = isNull(stocks.ulpId); // Default initial view is UP3
		}
	} else {
		condition = eq(stocks.ulpId, user?.ulpId as number);
		displayUlpName = `ULP ${user?.ulpName}`;
	}

	const allMaterials = await db.select({
		id: materials.id,
		name: materials.name,
		unit: materials.unit,
		description: materials.description,
		stockQuantity: stocks.quantity
	})
	.from(materials)
	.leftJoin(stocks, and(eq(materials.id, stocks.materialId), condition))
	.orderBy(materials.id);

	return {
		materials: allMaterials,
		userRole: user?.role,
		ulpName: displayUlpName,
		allUlps,
		selectedUlpId: selectedUlpId || 'up3'
	};
};

export const actions: Actions = {
	tambah: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Hanya Admin UP3 yang dapat menambah material.' });

		const data = await request.formData();
		const jenisInput = data.get('jenisInput') as string; 
		const quantityStr = data.get('jumlah') as string;
		const quantity = parseInt(quantityStr);
		
		if (!quantityStr || isNaN(quantity) || quantity <= 0) return fail(400, { error: 'Jumlah fisik tidak valid.' });

		let materialId: number;

		if (jenisInput === 'BARU') {
			const name = data.get('nama') as string;
			const unit = data.get('satuan') as string;
			const desc = data.get('deskripsi') as string;
			
			if (!name || !unit) return fail(400, { error: 'Nama material dan satuan wajib diisi.' });
			
			const [insertMat] = await db.insert(materials).values({ name, unit, description: desc });
			materialId = insertMat.insertId;
		} else {
			materialId = parseInt(data.get('materialId') as string);
			if (!materialId) return fail(400, { error: 'Material referensi tidak valid.' });
		}

		// Update or Insert pure UP3 stock (ulpId is null)
		const [existingStock] = await db.select().from(stocks).where(and(eq(stocks.materialId, materialId), isNull(stocks.ulpId)));
		if (existingStock) {
			await db.update(stocks)
				.set({ quantity: sql`quantity + ${quantity}` })
				.where(eq(stocks.id, existingStock.id));
		} else {
			await db.insert(stocks).values({
				materialId: materialId,
				ulpId: null, // 100% UP3 Central property
				quantity: quantity
			});
		}

		// Record the transaction for reporting
		const ref = `INC-${Date.now()}`;
		const [insertTrx] = await db.insert(transactions).values({
			referenceNumber: ref,
			type: 'INCOMING',
			status: 'COMPLETED',
			createdBy: user.id
		});

		await db.insert(transactionDetails).values({
			transactionId: insertTrx.insertId,
			materialId: materialId,
			quantity: quantity,
			description: 'Penerimaan Material Pusat'
		});

		return { success: true, message: 'Material Pusat berhasil ditambahkan/diperbarui!' };
	},

	edit: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Hanya Admin UP3 yang dapat mengedit.' });

		const data = await request.formData();
		const materialId = parseInt(data.get('materialId') as string);
		const name = data.get('nama') as string;
		const unit = data.get('satuan') as string;

		if (!materialId || !name || !unit) return fail(400, { error: 'Data edit tidak valid.' });

		await db.update(materials).set({ name, unit }).where(eq(materials.id, materialId));
		return { success: true, message: 'Katalog material berhasil diperbarui!' };
	},

	hapus: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Hanya Admin UP3 yang dapat menghapus.' });

		const data = await request.formData();
		const materialId = parseInt(data.get('materialId') as string);
		if (!materialId) return fail(400, { error: 'ID tidak valid.' });

		try {
			// Clean up pure 0 quantity stocks if they exist to aid deletion
			await db.delete(stocks).where(and(eq(stocks.materialId, materialId), eq(stocks.quantity, 0)));
			
			// Delete material
			await db.delete(materials).where(eq(materials.id, materialId));
			return { success: true, message: 'Material berhasil dihapus secara permanen.' };
		} catch (error: any) {
			// Foreign key constraint violation
			return fail(400, { error: 'Gagal dihapus: Material ini masih memiliki sisa stok ULP atau terikat pada riwayat Transaksi mutasi.' });
		}
	}
};
