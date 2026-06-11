import { db } from '$lib/server/db';
import { ulps, materials, transactions, transactionDetails, stocks } from '$lib/server/db/schema';
import { desc, eq, and, sql, asc, isNull } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import QRCode from 'qrcode';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!user) return {};

	const allUlps =
		user.role === 'ADMIN_UP3' ? await db.select().from(ulps).orderBy(asc(ulps.name)) : [];
	// Get pending initial stock materials for ULP to prevent double submission
	let pendingInitMatIds: number[] = [];
	if (user.role === 'ADMIN_ULP') {
		const pendingInitStocks = await db
			.select({ materialId: transactionDetails.materialId })
			.from(transactions)
			.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.where(
				and(
					eq(transactions.targetUlpId, user.ulpId!),
					eq(transactions.type, 'INITIAL_STOCK'),
					eq(transactions.status, 'REQUESTED')
				)
			);
		pendingInitMatIds = pendingInitStocks.map((p) => p.materialId);
	}

	const rawMaterials = await db
		.select({
			id: materials.id,
			name: materials.name,
			unit: materials.unit,
			stock: sql<number>`COALESCE(${stocks.quantity}, 0)`,
			stockId: stocks.id
		})
		.from(materials)
		.leftJoin(
			stocks,
			and(
				eq(materials.id, stocks.materialId),
				user.role === 'ADMIN_UP3' ? isNull(stocks.ulpId) : eq(stocks.ulpId, user.ulpId!)
			)
		)
		.orderBy(asc(materials.name));

	// Fetch UP3 stocks separately to show available central stock to ULP during requests
	const up3Stocks = await db
		.select({
			materialId: stocks.materialId,
			quantity: stocks.quantity
		})
		.from(stocks)
		.where(isNull(stocks.ulpId));

	const up3StockMap = new Map(up3Stocks.map((s) => [s.materialId, s.quantity]));

	const allMaterials = rawMaterials.map((m) => ({
		id: m.id,
		name: m.name,
		unit: m.unit,
		stock: m.stock,
		up3Stock: up3StockMap.get(m.id) || 0,
		hasStockRecord: m.stockId !== null || pendingInitMatIds.includes(m.id)
	}));

	// Data for ULP: Pending Verifikasi (Distribution from UP3)
	let pendingVerifikasi: any[] = [];
	// Data for ULP & UP3: Draft Usage (Needs photo to finalize)
	let draftUsages: any[] = [];
	// Data for UP3: Pending Requests from ULP
	let requestedTransactions: any[] = [];

	const usageCondition =
		user.role === 'ADMIN_UP3'
			? isNull(transactions.targetUlpId)
			: eq(transactions.targetUlpId, user.ulpId!);

	const usageRows = await db
		.select({
			id: transactions.id,
			ref: transactions.referenceNumber,
			purpose: transactions.usagePurpose,
			date: transactions.createdAt,
			materialName: materials.name,
			unit: materials.unit,
			quantity: transactionDetails.quantity
		})
		.from(transactions)
		.innerJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
		.innerJoin(materials, eq(transactionDetails.materialId, materials.id))
		.where(and(usageCondition, eq(transactions.status, 'DRAFT'), eq(transactions.type, 'USAGE')));

	const usageMap = new Map();
	usageRows.forEach((row) => {
		if (!usageMap.has(row.id)) {
			usageMap.set(row.id, {
				id: row.id,
				ref: row.ref,
				purpose: row.purpose,
				date: row.date,
				items: []
			});
		}
		usageMap
			.get(row.id)
			.items.push({ name: row.materialName, quantity: row.quantity, unit: row.unit });
	});
	draftUsages = Array.from(usageMap.values());

	if (user.role === 'ADMIN_UP3') {
		const reqRows = await db
			.select({
				id: transactions.id,
				ref: transactions.referenceNumber,
				ulpName: ulps.name,
				targetUlpId: transactions.targetUlpId,
				takerName: transactions.takerName,
				date: transactions.createdAt,
				type: transactions.type,
				requestLetter: transactions.requestLetterBase64,
				materialId: transactionDetails.materialId,
				materialName: materials.name,
				quantity: transactionDetails.quantity,
				description: transactionDetails.description
			})
			.from(transactions)
			.innerJoin(ulps, eq(transactions.targetUlpId, ulps.id))
			.leftJoin(transactionDetails, eq(transactions.id, transactionDetails.transactionId))
			.leftJoin(materials, eq(transactionDetails.materialId, materials.id))
			.where(eq(transactions.status, 'REQUESTED'));

		const reqMap = new Map();
		reqRows.forEach((row) => {
			if (!reqMap.has(row.id)) {
				reqMap.set(row.id, {
					id: row.id,
					ref: row.ref,
					ulpName: row.ulpName,
					targetUlpId: row.targetUlpId,
					takerName: row.takerName,
					date: row.date,
					type: row.type,
					requestLetter: row.requestLetter,
					items: []
				});
			}
			if (row.materialId) {
				reqMap.get(row.id).items.push({
					materialId: row.materialId.toString(),
					name: row.materialName || '',
					quantity: row.quantity,
					jumlah: row.quantity,
					keterangan: row.description || ''
				});
			}
		});
		requestedTransactions = Array.from(reqMap.values());
	}

	return {
		ulps: allUlps,
		materials: allMaterials,
		history: [],
		pendingVerifikasi,
		draftUsages,
		requestedTransactions,
		userRole: user.role,
		userUlpId: user.ulpId
	};
};

export const actions: Actions = {
	// (ULP) Upload Surat Permintaan & Pilih Material
	minta: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP')
			return fail(403, { error: 'Hanya Admin ULP yang dapat membuat Permintaan.' });

		const formData = await request.formData();
		const letterBase64 = formData.get('letterBase64') as string;
		const takerName = formData.get('takerName') as string;
		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');
		const keterangans = formData.getAll('keterangan[]');

		if (!takerName) return fail(400, { error: 'Nama petugas pengambil harus diisi!' });
		if (materialIds.length === 0) {
			return fail(400, { error: 'Pilih minimal 1 material yang diajukan!' });
		}

		const result = await db
			.transaction(async (tx) => {
				const refNumber = `REQ-${user.ulpId}-${Date.now()}`;
				const [insertTrx] = await tx.insert(transactions).values({
					referenceNumber: refNumber,
					type: 'DISTRIBUTION',
					status: 'REQUESTED',
					createdBy: user.id,
					targetUlpId: user.ulpId,
					takerName: takerName,
					requestLetterBase64: letterBase64 || null
				});

				for (let i = 0; i < materialIds.length; i++) {
					const matId = parseInt(materialIds[i] as string);
					const qty = parseInt(jumlahs[i] as string);

					if (!matId || isNaN(qty) || qty <= 0) {
						throw new Error('Data material tidak lengkap atau jumlah tidak valid.');
					}

					await tx.insert(transactionDetails).values({
						transactionId: insertTrx.insertId,
						materialId: matId,
						quantity: qty,
						description: keterangans[i] as string
					});
				}
				return { success: true };
			})
			.catch((err) => ({ error: err.message }));

		if ('error' in result && result.error) return fail(400, { error: result.error });

		return { success: true, message: 'Permintaan Material Berhasil Diajukan!' };
	},

	// (UP3) Process requested transaction or create new one and complete it immediately
	draft: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const requestId = formData.get('requestId') as string;
		const ulpId = formData.get('ulpId') as string;
		const takerName = formData.get('takerName') as string;
		const photoBase64 = formData.get('photoBase64') as string;
		const firstParty = formData.get('firstParty') as string;
		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');
		const keterangans = formData.getAll('keterangan[]');

		if (!takerName || !firstParty || materialIds.length === 0) {
			return fail(400, {
				error: 'Lengkapi Nama Pengambil, Pihak Pertama, dan minimal 1 material!'
			});
		}

		// BACKEND STOCK VALIDATION (UP3)
		let validItemsCount = 0;
		for (let i = 0; i < materialIds.length; i++) {
			const matId = parseInt(materialIds[i] as string);
			const qty = parseInt(jumlahs[i] as string);
			if (isNaN(qty) || qty <= 0) continue; // Skip items with 0 qty

			validItemsCount++;
			const [currentStock] = await db
				.select()
				.from(stocks)
				.where(and(eq(stocks.materialId, matId), isNull(stocks.ulpId)));

			if (!currentStock || currentStock.quantity < qty) {
				const [mat] = await db.select().from(materials).where(eq(materials.id, matId));
				return fail(400, { error: `Gagal! Stok ${mat?.name} tidak cukup di Gudang Pusat.` });
			}
		}

		if (validItemsCount === 0) {
			return fail(400, {
				error: 'Gagal! Harus ada minimal 1 material dengan jumlah lebih dari 0 untuk ditransfer.'
			});
		}

		const result = await db
			.transaction(async (tx) => {
				let trxId: number;
				let refNumber: string;
				let targetUlpIdVal: number;

				if (requestId) {
					trxId = parseInt(requestId);
					const [existingTrx] = await tx
						.select()
						.from(transactions)
						.where(eq(transactions.id, trxId));
					if (!existingTrx) throw new Error('Permintaan tidak ditemukan.');
					refNumber = existingTrx.referenceNumber;
					targetUlpIdVal = existingTrx.targetUlpId!;

					await tx
						.update(transactions)
						.set({
							status: 'COMPLETED',
							takerName: takerName,
							photoBase64: photoBase64,
							firstParty: firstParty,
							approvedAt: new Date()
						})
						.where(eq(transactions.id, trxId));
				} else {
					if (!ulpId) throw new Error('Tentukan ULP Tujuan untuk transfer baru.');
					targetUlpIdVal = parseInt(ulpId);
					refNumber = `TRANSFER-${Date.now()}`;
					const [insertTrx] = await tx.insert(transactions).values({
						referenceNumber: refNumber,
						type: 'DISTRIBUTION',
						status: 'COMPLETED',
						createdBy: user.id,
						targetUlpId: targetUlpIdVal,
						takerName: takerName,
						photoBase64: photoBase64,
						firstParty: firstParty,
						approvedAt: new Date()
					});
					trxId = insertTrx.insertId;
				}

				// Hapus detail transaksi lama jika ada (untuk menghindari duplikasi saat memproses permintaan)
				await tx.delete(transactionDetails).where(eq(transactionDetails.transactionId, trxId));

				// Insert items and adjust stocks
				for (let i = 0; i < materialIds.length; i++) {
					const matId = parseInt(materialIds[i] as string);
					const qty = parseInt(jumlahs[i] as string);
					const descValue = (keterangans[i] as string) || '';

					if (isNaN(qty) || qty <= 0) continue; // Skip items with 0 quantity!

					await tx.insert(transactionDetails).values({
						transactionId: trxId,
						materialId: matId,
						quantity: qty,
						description: descValue
					});

					// Deduct from UP3 central stock
					const [up3Stock] = await tx
						.select()
						.from(stocks)
						.where(and(eq(stocks.materialId, matId), isNull(stocks.ulpId)));
					if (!up3Stock || up3Stock.quantity < qty) {
						const [mat] = await tx.select().from(materials).where(eq(materials.id, matId));
						throw new Error(`Stok ${mat?.name} tidak cukup di Gudang Pusat.`);
					}
					await tx
						.update(stocks)
						.set({ quantity: sql`quantity - ${qty}` })
						.where(eq(stocks.id, up3Stock.id));

					// Add to ULP stock
					const [ulpStock] = await tx
						.select()
						.from(stocks)
						.where(and(eq(stocks.materialId, matId), eq(stocks.ulpId, targetUlpIdVal)));
					if (ulpStock) {
						await tx
							.update(stocks)
							.set({ quantity: sql`quantity + ${qty}` })
							.where(eq(stocks.id, ulpStock.id));
					} else {
						await tx.insert(stocks).values({
							materialId: matId,
							ulpId: targetUlpIdVal,
							quantity: qty
						});
					}
				}

				// Generate QR Code dengan format teks informatif seperti PLN AMS
				const origin = new URL(request.url).origin;
				const validationUrl = `${origin}/validasi/${refNumber}`;
				const [targetUlp] = await tx
					.select({ name: ulps.name })
					.from(ulps)
					.where(eq(ulps.id, targetUlpIdVal));
				const ulpName = targetUlp?.name || 'ULP';
				const firstPartyName = (firstParty || 'NANANG DARYANTO').toUpperCase();
				const qrContent = `UP3 MADURA - ${firstPartyName}\nNo.BAST: ${refNumber}\nPenerima: ${takerName} - ULP ${ulpName}\nDokumen ini diproduksi oleh ${validationUrl}`;
				const qrCodeBase64 = await QRCode.toDataURL(qrContent, {
					errorCorrectionLevel: 'M',
					margin: 2
				});

				await tx.update(transactions).set({ qrCodeBase64 }).where(eq(transactions.id, trxId));

				return { success: true };
			})
			.catch((err) => {
				return { error: err.message };
			});

		if ('error' in result && result.error) return fail(400, { error: result.error });

		return { success: true, message: 'Transfer Material Berhasil Diproses dan Selesai!' };
	},

	// (UP3) Tolak Permintaan ULP
	tolakPermintaan: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const requestId = formData.get('requestId') as string;
		if (!requestId) return fail(400, { error: 'Tidak ada permintaan yang dipilih.' });

		await db
			.update(transactions)
			.set({ status: 'REJECTED' })
			.where(eq(transactions.id, parseInt(requestId)));

		return { success: true, message: 'Permintaan Material dari ULP berhasil ditolak.' };
	},

	// (ULP) Verifikasi Penerimaan
	verifikasi: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		if (!trxId) return fail(400, { error: 'Pilih transaksi yang akan dikonfirmasi.' });

		await db
			.update(transactions)
			.set({ status: 'APPROVED_ULP', approvedAt: new Date() })
			.where(and(eq(transactions.id, parseInt(trxId)), eq(transactions.targetUlpId, user.ulpId!)));

		return { success: true, message: 'Penerimaan telah dikonfirmasi!' };
	},

	// (UP3 & ULP) Input Pemakaian Lapangan (Draft or Completed)
	penggunaan: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP' && user?.role !== 'ADMIN_UP3')
			return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const tanggal = formData.get('tanggal') as string;
		const usagePurpose = formData.get('usagePurpose') as string;
		const takerName = formData.get('takerName') as string;
		const targetStatus = formData.get('targetStatus') as string; // 'DRAFT' or 'COMPLETED'

		const photoBase64Arr = formData.getAll('photoBase64[]');
		const singlePhoto = formData.get('photoBase64') as string;
		let photoDataToSave = null;
		if (photoBase64Arr.length > 0) {
			photoDataToSave = JSON.stringify(photoBase64Arr);
		} else if (singlePhoto) {
			photoDataToSave = JSON.stringify([singlePhoto]);
		}

		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');
		const keterangans = formData.getAll('keterangan[]');

		if (!tanggal || !usagePurpose || !takerName || materialIds.length === 0) {
			return fail(400, { error: 'Lengkapi detail pemakaian dan minimal 1 material!' });
		}

		// BACKEND PHOTO EVIDEN VALIDATION FOR ULP
		if (targetStatus === 'COMPLETED' && user.role === 'ADMIN_ULP' && !photoDataToSave) {
			return fail(400, {
				error: 'Gagal! Foto bukti (eviden) wajib diunggah untuk konfirmasi pemakaian.'
			});
		}

		// BACKEND STOCK VALIDATION
		if (targetStatus === 'COMPLETED') {
			for (let i = 0; i < materialIds.length; i++) {
				const matId = parseInt(materialIds[i] as string);
				const qty = parseInt(jumlahs[i] as string);
				const stockCondition =
					user.role === 'ADMIN_UP3' ? isNull(stocks.ulpId) : eq(stocks.ulpId, user.ulpId!);
				const [currentStock] = await db
					.select()
					.from(stocks)
					.where(and(eq(stocks.materialId, matId), stockCondition));

				if (!currentStock || currentStock.quantity < qty) {
					const [mat] = await db.select().from(materials).where(eq(materials.id, matId));
					return fail(400, { error: `Gagal! Stok ${mat?.name} tidak cukup di gudang.` });
				}
			}
		}

		// Use a transaction for stock deduction if COMPLETED
		const result = await db
			.transaction(async (tx) => {
				if (targetStatus === 'COMPLETED') {
					for (let i = 0; i < materialIds.length; i++) {
						const matId = parseInt(materialIds[i] as string);
						const qty = parseInt(jumlahs[i] as string);

						const stockCondition =
							user.role === 'ADMIN_UP3' ? isNull(stocks.ulpId) : eq(stocks.ulpId, user.ulpId!);
						const [currentStock] = await tx
							.select()
							.from(stocks)
							.where(and(eq(stocks.materialId, matId), stockCondition));
						if (!currentStock || currentStock.quantity < qty) {
							const [mat] = await tx.select().from(materials).where(eq(materials.id, matId));
							throw new Error(`Stok ${mat?.name} tidak cukup.`);
						}
						await tx
							.update(stocks)
							.set({ quantity: sql`quantity - ${qty}` })
							.where(eq(stocks.id, currentStock.id));
					}
				}

				const refNumber =
					user.role === 'ADMIN_UP3'
						? `PEMAKAIAN-UP3-${Date.now()}`
						: `PEMAKAIAN-${user.ulpId}-${Date.now()}`;
				const [insertTrx] = await tx.insert(transactions).values({
					referenceNumber: refNumber,
					type: 'USAGE',
					status: targetStatus === 'COMPLETED' ? 'COMPLETED' : 'DRAFT',
					createdBy: user.id,
					targetUlpId: user.role === 'ADMIN_UP3' ? null : user.ulpId,
					takerName: takerName,
					usagePurpose: usagePurpose,
					photoBase64: photoDataToSave,
					createdAt: new Date(tanggal)
				});

				for (let i = 0; i < materialIds.length; i++) {
					await tx.insert(transactionDetails).values({
						transactionId: insertTrx.insertId,
						materialId: parseInt(materialIds[i] as string),
						quantity: parseInt(jumlahs[i] as string),
						description: keterangans[i] as string
					});
				}

				return { success: true };
			})
			.catch((err) => {
				return { error: err.message };
			});

		if ('error' in result && result.error) return fail(400, { error: result.error });

		return {
			success: true,
			message:
				targetStatus === 'COMPLETED'
					? 'Pemakaian Lapangan Berhasil Dikonfirmasi! Stok telah terpotong.'
					: 'Draf Pemakaian Berhasil Disimpan (Belum Memotong Stok).'
		};
	},

	// (UP3 & ULP) Finalisasi Pemakaian Lapangan + Potong Stok
	finalisasiPemakaian: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_ULP' && user?.role !== 'ADMIN_UP3')
			return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;

		const photoBase64Arr = formData.getAll('photoBase64[]');
		const singlePhoto = formData.get('photoBase64') as string;
		let photoDataToSave = null;
		if (photoBase64Arr.length > 0) {
			photoDataToSave = JSON.stringify(photoBase64Arr);
		} else if (singlePhoto) {
			photoDataToSave = JSON.stringify([singlePhoto]);
		}

		if (!trxId) return fail(400, { error: 'Pilih draf pemakaian!' });

		const id = parseInt(trxId);
		const details = await db
			.select()
			.from(transactionDetails)
			.where(eq(transactionDetails.transactionId, id));

		// Validasi Stok dan Potong Stok
		for (const d of details) {
			const stockCondition =
				user.role === 'ADMIN_UP3' ? isNull(stocks.ulpId) : eq(stocks.ulpId, user.ulpId!);
			const [currentStock] = await db
				.select()
				.from(stocks)
				.where(and(eq(stocks.materialId, d.materialId), stockCondition));
			if (!currentStock || currentStock.quantity < d.quantity) {
				const [mat] = await db.select().from(materials).where(eq(materials.id, d.materialId));
				return fail(400, { error: `Gagal! Stok ${mat?.name} tidak cukup.` });
			}
			await db
				.update(stocks)
				.set({ quantity: sql`quantity - ${d.quantity}` })
				.where(eq(stocks.id, currentStock.id));
		}

		await db
			.update(transactions)
			.set({
				status: 'COMPLETED',
				photoBase64: photoDataToSave
			})
			.where(eq(transactions.id, id));

		return { success: true, message: 'Pemakaian Lapangan Selesai! Stok telah terpotong.' };
	},

	finalisasi: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		if (!trxId) return fail(400, { error: 'ID Transaksi tidak valid.' });

		const [trx] = await db
			.select()
			.from(transactions)
			.where(eq(transactions.id, parseInt(trxId)));
		if (!trx || trx.status !== 'APPROVED_ULP') {
			return fail(400, { error: 'Transaksi tidak valid atau belum di-approve oleh ULP.' });
		}

		const details = await db
			.select()
			.from(transactionDetails)
			.where(eq(transactionDetails.transactionId, trx.id));
		if (details.length === 0) {
			return fail(400, { error: 'Detail transaksi transfer tidak ditemukan.' });
		}

		// Mutasi Stok Real-time Logic (Multi-item)
		for (const detail of details) {
			// 1. Check & Deduct UP3 (ulpId IS NULL)
			const [up3Stock] = await db
				.select()
				.from(stocks)
				.where(and(eq(stocks.materialId, detail.materialId), sql`ulp_id IS NULL`));

			if (!up3Stock || up3Stock.quantity < detail.quantity) {
				const [matInfo] = await db
					.select()
					.from(materials)
					.where(eq(materials.id, detail.materialId));
				return fail(400, {
					error: `Gagal finalisasi! Stok "${matInfo?.name}" di Gudang Pusat tidak mencukupi (Sisa: ${up3Stock?.quantity || 0}).`
				});
			}

			await db
				.update(stocks)
				.set({ quantity: sql`quantity - ${detail.quantity}` })
				.where(and(eq(stocks.materialId, detail.materialId), sql`ulp_id IS NULL`));

			// 2. Add to ULP
			const [ulpStock] = await db
				.select()
				.from(stocks)
				.where(and(eq(stocks.materialId, detail.materialId), eq(stocks.ulpId, trx.targetUlpId!)));

			if (ulpStock) {
				await db
					.update(stocks)
					.set({ quantity: sql`quantity + ${detail.quantity}` })
					.where(eq(stocks.id, ulpStock.id));
			} else {
				await db.insert(stocks).values({
					materialId: detail.materialId,
					ulpId: trx.targetUlpId!,
					quantity: detail.quantity
				});
			}
		}

		// Generate QR Code dengan format teks informatif seperti PLN AMS
		const origin = new URL(request.url).origin;
		const validationUrl = `${origin}/validasi/${trx.referenceNumber}`;
		const [targetUlpData] = await db
			.select({ name: ulps.name })
			.from(ulps)
			.where(eq(ulps.id, trx.targetUlpId!));
		const ulpNameFin = targetUlpData?.name || 'ULP';
		const firstPartyNameFin = (trx.firstParty || 'NANANG DARYANTO').toUpperCase();
		const qrContent = `UP3 MADURA - ${firstPartyNameFin}\nNo.BAST: ${trx.referenceNumber}\nPenerima: ${trx.takerName} - ULP ${ulpNameFin}\nDokumen ini diproduksi oleh ${validationUrl}`;
		const qrCodeBase64 = await QRCode.toDataURL(qrContent, {
			errorCorrectionLevel: 'M',
			margin: 2
		});

		await db
			.update(transactions)
			.set({ status: 'COMPLETED', qrCodeBase64 })
			.where(eq(transactions.id, trx.id));

		return { success: true, message: 'Mutasi Stok Multi-item Selesai!' };
	},

	// (ULP & UP3) Input Stok Awal
	stokAwal: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const materialIds = formData.getAll('materialId[]');
		const jumlahs = formData.getAll('jumlah[]');

		if (materialIds.length === 0) {
			return fail(400, { error: 'Pilih minimal 1 material!' });
		}

		const result = await db
			.transaction(async (tx) => {
				if (user.role === 'ADMIN_UP3') {
					const refNumber = `STOK-AWAL-UP3-${Date.now()}`;
					const [insertTrx] = await tx.insert(transactions).values({
						referenceNumber: refNumber,
						type: 'INITIAL_STOCK',
						status: 'COMPLETED',
						createdBy: user.id,
						targetUlpId: null,
						approvedAt: new Date()
					});

					for (let i = 0; i < materialIds.length; i++) {
						const matId = parseInt(materialIds[i] as string);
						const qty = parseInt(jumlahs[i] as string);

						if (!matId || isNaN(qty) || qty < 0) {
							throw new Error('Data material tidak lengkap atau jumlah tidak valid.');
						}

						await tx.insert(transactionDetails).values({
							transactionId: insertTrx.insertId,
							materialId: matId,
							quantity: qty,
							description: 'Input Stok Awal Pusat'
						});

						// Update or Insert Stok UP3
						const [up3Stock] = await tx
							.select()
							.from(stocks)
							.where(and(eq(stocks.materialId, matId), isNull(stocks.ulpId)));
						if (up3Stock) {
							await tx.update(stocks).set({ quantity: qty }).where(eq(stocks.id, up3Stock.id));
						} else {
							await tx.insert(stocks).values({
								materialId: matId,
								ulpId: null,
								quantity: qty
							});
						}
					}
					return { success: true, message: 'Stok Awal Pusat Berhasil Disimpan!' };
				} else {
					const timestamp = Date.now();
					const refNumber = `STOK-AWAL-${user.ulpId}-${timestamp}`;
					const [insertTrx] = await tx.insert(transactions).values({
						referenceNumber: refNumber,
						type: 'INITIAL_STOCK',
						status: 'REQUESTED',
						createdBy: user.id,
						targetUlpId: user.ulpId
					});

					for (let i = 0; i < materialIds.length; i++) {
						const matId = parseInt(materialIds[i] as string);
						const qty = parseInt(jumlahs[i] as string);

						if (!matId || isNaN(qty) || qty < 0) {
							throw new Error('Data material tidak lengkap atau jumlah tidak valid.');
						}

						await tx.insert(transactionDetails).values({
							transactionId: insertTrx.insertId,
							materialId: matId,
							quantity: qty,
							description: 'Input Stok Awal ULP'
						});
					}

					return {
						success: true,
						message: 'Stok Awal Berhasil Diajukan (Menunggu Konfirmasi UP3)!'
					};
				}
			})
			.catch((err) => ({ error: err.message }));

		if ('error' in result && result.error) return fail(400, { error: result.error });

		return result;
	},

	// (UP3) Proses Stok Awal (Terima Sebagian/Semua atau Tolak)
	prosesStokAwal: async ({ request, locals }) => {
		const user = locals.user;
		if (user?.role !== 'ADMIN_UP3') return fail(403, { error: 'Akses ditolak.' });

		const formData = await request.formData();
		const trxId = formData.get('transactionId') as string;
		const actionType = formData.get('actionType') as string; // 'ACCEPT' or 'REJECT'
		const acceptedMaterials = formData.getAll('acceptedMaterials[]'); // array of materialIds

		if (!trxId) return fail(400, { error: 'ID Transaksi tidak valid.' });

		const [trx] = await db
			.select()
			.from(transactions)
			.where(eq(transactions.id, parseInt(trxId)));
		if (!trx || trx.status !== 'REQUESTED' || trx.type !== 'INITIAL_STOCK') {
			return fail(400, { error: 'Transaksi tidak valid.' });
		}

		if (actionType === 'REJECT') {
			await db.update(transactions).set({ status: 'REJECTED' }).where(eq(transactions.id, trx.id));
			return { success: true, message: 'Stok Awal ULP telah ditolak secara keseluruhan.' };
		}

		// Process Partial or Full Accept
		const details = await db
			.select()
			.from(transactionDetails)
			.where(eq(transactionDetails.transactionId, trx.id));
		if (details.length === 0) {
			return fail(400, { error: 'Detail transaksi stok awal tidak ditemukan.' });
		}

		if (acceptedMaterials.length === 0) {
			return fail(400, {
				error:
					'Gagal! Tidak ada material yang dicentang untuk diterima. Gunakan Tolak Semua jika ingin menolak.'
			});
		}

		// Update or Insert Stok ULP for ACCEPTED materials
		for (const detail of details) {
			if (acceptedMaterials.includes(detail.materialId.toString())) {
				const [ulpStock] = await db
					.select()
					.from(stocks)
					.where(and(eq(stocks.materialId, detail.materialId), eq(stocks.ulpId, trx.targetUlpId!)));

				if (ulpStock) {
					await db
						.update(stocks)
						.set({ quantity: detail.quantity }) // Set to exactly what was inputted
						.where(eq(stocks.id, ulpStock.id));
				} else {
					await db.insert(stocks).values({
						materialId: detail.materialId,
						ulpId: trx.targetUlpId!,
						quantity: detail.quantity
					});
				}
			} else {
				// Rejected material: Remove from transaction details so it doesn't show up as accepted
				await db.delete(transactionDetails).where(eq(transactionDetails.id, detail.id));
			}
		}

		await db
			.update(transactions)
			.set({ status: 'COMPLETED', approvedAt: new Date() })
			.where(eq(transactions.id, trx.id));

		return {
			success: true,
			message:
				'Persetujuan Stok Awal Berhasil! Material yang dicentang telah ditambahkan ke stok ULP.'
		};
	}
};
