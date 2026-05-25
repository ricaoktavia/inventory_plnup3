<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { loadingState } from '$lib/loadingState.svelte';

	let { data, form } = $props();

	let fileBase64 = $state(''); // For documentation photo (UP3) or installation photo (ULP)
	let requestLetterBase64 = $state(''); // For request letter (ULP)
	let isSubmitting = $state(false);

	function handleEnhance({ action }: { action: URL }) {
		isSubmitting = true;
		loadingState.start('Memproses Transaksi...', 3000);
		const startTime = Date.now();

		return async ({ result, update }: { result: any, update: any }) => {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, 2000 - elapsed);
			
			// Ensure it takes at least 2 seconds
			if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
			
			isSubmitting = false;
			loadingState.stop();

			if (result.type === 'success') {
				// Reset specific states based on the action
				if (action.search.includes('minta')) requestLetterBase64 = '';
				if (action.search.includes('draft') || action.search.includes('penggunaan')) {
					fileBase64 = '';
					selectedRequestId = '';
				}
				if (action.search.includes('finalisasi')) {
					fileBase64 = '';
					selectedUsageDraftId = '';
				}
			}
			await update();
		};
	}

	// Viewer Modal State
	let viewerBase64 = $state(''); // Data URL of file to view
	let showViewer = $state(false);

	function openViewer(dataUrl: string) {
		if (!dataUrl) return;
		viewerBase64 = dataUrl;
		showViewer = true;
	}

	function closeViewer() {
		showViewer = false;
		viewerBase64 = '';
	}

	// Compression Helper
	async function compressImage(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target?.result as string;
				img.onload = () => {
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');
					if (!ctx) return resolve(event.target?.result as string);

					// Calculate new dimensions (max 1600px)
					let width = img.width;
					let height = img.height;
					const maxSize = 1600;
					if (width > height) {
						if (width > maxSize) {
							height *= maxSize / width;
							width = maxSize;
						}
					} else {
						if (height > maxSize) {
							width *= maxSize / height;
							height = maxSize;
						}
					}

					canvas.width = width;
					canvas.height = height;
					ctx.drawImage(img, 0, 0, width, height);

					// Convert to base64 with 0.7 quality
					const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
					resolve(compressedBase64);
				};
				img.onerror = (err) => reject(err);
			};
			reader.onerror = (err) => reject(err);
		});
	}

	async function handleFileChange(event: Event, type: 'PHOTO' | 'LETTER') {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			
			// If it's an image, compress it
			if (file.type.startsWith('image/')) {
				try {
					const result = await compressImage(file);
					if (type === 'PHOTO') fileBase64 = result;
					else requestLetterBase64 = result;
				} catch (e) {
					console.error('Compression failed:', e);
				}
			} else {
				// For non-images (like PDF), use raw base64
				const reader = new FileReader();
				reader.onload = (e) => {
					if (type === 'PHOTO') fileBase64 = e.target?.result as string;
					else requestLetterBase64 = e.target?.result as string;
				};
				reader.readAsDataURL(file);
			}
		}
	}

	// Dynamic Materials Array State
	let materialRows = $state([{ materialId: '', jumlah: '', keterangan: '' }]);

	function addMaterialRow() {
		materialRows = [...materialRows, { materialId: '', jumlah: '', keterangan: '' }];
	}

	function removeMaterialRow(index: number) {
		materialRows = materialRows.filter((_, i) => i !== index);
	}

	// Tabs for ULP & UP3
	let ulpActiveTab = $state($page.url.searchParams.get('tab') || 'PERMINTAAN'); // PERMINTAAN | VERIFIKASI | PEMAKAIAN | STOK_AWAL
	let up3ActiveTab = $state($page.url.searchParams.get('tab') || 'TRANSFER'); // TRANSFER | PEMAKAIAN | STOK_AWAL | KONFIRMASI_STOK

	// Selected Pending Verifikasi State (ULP)
	let selectedVerifId = $state('');
	let selectedVerifData = $derived((data.pendingVerifikasi || []).find((v: any) => v.id.toString() === selectedVerifId?.toString()) || null);

	// Selected Draft Usage State (ULP)
	let selectedUsageDraftId = $state('');
	let selectedUsageDraftData = $derived((data.draftUsages || []).find((d: any) => d.id.toString() === selectedUsageDraftId?.toString()) || null);

	// Selected Request State (UP3)
	let selectedRequestId = $state('');
	let selectedRequestData = $derived((data.requestedTransactions || []).find((r: any) => r.id.toString() === selectedRequestId?.toString()) || null);

	// Taker Name State for UP3
	let up3TakerName = $state('');
	let up3FirstParty = $state('');



	function handleRequestChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const val = select.value;
		selectedRequestId = val;

		const reqData = (data.requestedTransactions || []).find((r: any) => r.id.toString() === val) || null;

		if (val && reqData) {
			if (reqData.items && reqData.items.length > 0) {
				materialRows = reqData.items.map((item: any) => ({
					materialId: item.materialId.toString(),
					jumlah: item.jumlah,
					keterangan: item.keterangan || ''
				}));
			}
			up3TakerName = reqData.takerName || '';
		} else if (val === '') {
			materialRows = [{ materialId: '', jumlah: '', keterangan: '' }];
			up3TakerName = '';
			up3FirstParty = '';
		}
	}
</script>

<svelte:head>
	<title>Transaksi Material - PLN Gudang</title>
</svelte:head>

<div class="max-w-4xl mx-auto w-full min-h-[calc(100vh-140px)] flex flex-col px-2 pb-10">
	
	<!-- LEFT PANEL: Dynamic Form -->
	<div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col min-h-[650px]">
		<div class="bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4] p-4 flex items-center text-white shrink-0 relative overflow-hidden">
			<svg class="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 20">
				<path d="M-10,30 L60,-10 L70,-10 L0,30 Z" fill="rgba(255,255,255,0.2)"></path>
			</svg>
			<img src="/logo-icon.png" class="h-12 w-auto object-contain shrink-0 mr-3 relative z-10 drop-shadow-md" alt="Logo PLN"/>
			<div class="font-bold text-lg leading-tight flex-1 flex justify-between items-center relative z-10">
				<div>PLN <span class="font-normal text-sm opacity-90 ml-1">Transaksi Material</span></div>
			</div>
		</div>

		<div class="p-8 flex-1 flex flex-col">
			{#if form?.success}
				<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium">✅ {form.message}</div>
			{/if}
			{#if form?.error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium">⚠️ {form.error}</div>
			{/if}

			{#if data.userRole === 'ADMIN_UP3'}
				<div class="flex border-b border-gray-200 mb-6 bg-gray-50 p-1 rounded-t-lg">
					<button class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab === 'TRANSFER' ? 'bg-white text-[#0A417A] shadow-sm rounded-md' : 'text-gray-400 hover:text-gray-600'}" onclick={() => { up3ActiveTab = 'TRANSFER'; materialRows = [{ materialId: '', jumlah: '', keterangan: '' }]; selectedRequestId = ''; }}>
						TRANSFER MATERIAL
					</button>
					<button class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab === 'PEMAKAIAN' ? 'bg-white text-[#0A417A] shadow-sm rounded-md' : 'text-gray-400 hover:text-gray-600'}" onclick={() => { up3ActiveTab = 'PEMAKAIAN'; materialRows = [{ materialId: '', jumlah: '', keterangan: '' }]; }}>
						PEMAKAIAN LAPANGAN
					</button>
					{#if data.materials.filter(m => !m.hasStockRecord).length > 0 || up3ActiveTab === 'STOK_AWAL'}
						<button class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab === 'STOK_AWAL' ? 'bg-white text-[#0A417A] shadow-sm rounded-md' : 'text-gray-400 hover:text-gray-600'}" onclick={() => { up3ActiveTab = 'STOK_AWAL'; materialRows = [{ materialId: '', jumlah: '', keterangan: '' }]; }}>
							INPUT STOK AWAL
						</button>
					{/if}
					{#if (data.requestedTransactions || []).filter(t => t.type === 'INITIAL_STOCK').length > 0 || up3ActiveTab === 'KONFIRMASI_STOK'}
						<button class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab === 'KONFIRMASI_STOK' ? 'bg-white text-[#0A417A] shadow-sm rounded-md' : 'text-gray-400 hover:text-gray-600'}" onclick={() => up3ActiveTab = 'KONFIRMASI_STOK'}>
							PERSETUJUAN STOK ULP
							{#if (data.requestedTransactions || []).filter(t => t.type === 'INITIAL_STOCK').length > 0}
								<span class="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full ml-1">
									{(data.requestedTransactions || []).filter(t => t.type === 'INITIAL_STOCK').length}
								</span>
							{/if}
						</button>
					{/if}
				</div>

				{#if up3ActiveTab === 'TRANSFER'}
					<h2 class="text-xl font-bold text-[#0A417A] mb-6 border-b border-gray-100 pb-2">Proses Transfer Material</h2>

					<form method="POST" action="?/draft" use:enhance={handleEnhance} class="space-y-5 flex-1 flex flex-col">
					<!-- Pilih Permintaan ULP (Opsional) -->
					<div class="space-y-1.5">
						<div class="flex justify-between items-center">
							<label for="requestId" class="block text-sm font-semibold text-[#0A417A]">Pilih Permintaan ULP (Jika ada)</label>
							{#if selectedRequestData?.requestLetter}
								<button type="button" onclick={() => openViewer(selectedRequestData.requestLetter)} class="text-[10px] font-black text-cyan-600 hover:text-cyan-700 flex items-center bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 transition-all">
									<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
									BUKA SURAT PERMINTAAN
								</button>
							{/if}
						</div>
						<select id="requestId" name="requestId" value={selectedRequestId} onchange={handleRequestChange} class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500 bg-gray-50 italic">
							<option value="">-- Transfer Langsung (Tanpa Permintaan) --</option>
							{#each data.requestedTransactions.filter(r => r.type !== 'INITIAL_STOCK') as req}
								<option value={req.id.toString()}>{req.ref} - {req.ulpName}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="space-y-1.5">
							<label for="ulpId" class="block text-sm font-semibold text-[#0A417A]">Unit ULP Tujuan</label>
							{#if selectedRequestId}
								<input type="text" value={selectedRequestData?.ulpName} disabled class="block w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
								<input type="hidden" name="ulpId" value={selectedRequestData?.targetUlpId}>
							{:else}
								<select id="ulpId" name="ulpId" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500">
									<option value="">Pilih ULP...</option>
									{#each data.ulps as ulp}
										<option value={ulp.id}>{ulp.name}</option>
									{/each}
								</select>
							{/if}
						</div>
						<div class="space-y-1.5">
							<label for="takerName" class="block text-sm font-semibold text-[#0A417A]">Nama Pengambil</label>
							<input type="text" id="takerName" name="takerName" bind:value={up3TakerName} placeholder="Contoh: Budi (ULP Kota)" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500">
						</div>
						<div class="space-y-1.5">
							<label for="firstParty" class="block text-sm font-semibold text-[#0A417A]">Pihak Pertama</label>
							<input type="text" id="firstParty" name="firstParty" bind:value={up3FirstParty} placeholder="Nama Pihak Pertama (UP3)" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500 bg-white">
						</div>
					</div>

					<!-- Rincian Material Dynamic -->
					<div class="border border-gray-200 p-4 rounded-xl bg-gray-50/50">
						<div class="flex justify-between items-center mb-3">
							<label class="block text-sm font-bold text-[#0A417A] uppercase tracking-wider">Rincian Barang</label>
							<button type="button" onclick={addMaterialRow} class="text-[10px] font-black text-white bg-[#0188CE] hover:bg-blue-600 px-3 py-1 rounded-md shadow-sm">
								+ TAMBAH BARIS
							</button>
						</div>
						
						<div class="space-y-3">
							{#each materialRows as row, i}
								<div class="p-3 border border-gray-200 rounded-lg bg-white space-y-2 relative shadow-sm">
									<button type="button" onclick={() => removeMaterialRow(i)} class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full shadow hover:bg-red-600 transition-colors z-20">
										<span class="text-[10px]">✕</span>
									</button>
									<select 
										name="materialId[]" 
										bind:value={row.materialId}
										required 
										class="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-cyan-500 font-bold"
									>
										<option value="">Pilih Material...</option>
										{#each data.materials as mat}
											<option value={mat.id.toString()} disabled={mat.stock <= 0}>
												{mat.name} ({mat.unit}) — STOK: {mat.stock}
											</option>
										{/each}
									</select>
									<div class="flex gap-2">
										<div class="relative w-20">
											<input 
												type="number" 
												name="jumlah[]" 
												placeholder="Jml" 
												bind:value={row.jumlah}
												required 
												min="0"
												max={data.materials.find(m => m.id.toString() === row.materialId)?.stock || 1000000}
												class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-center outline-none {row.jumlah > (data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0) ? 'border-red-500 bg-red-50 text-red-600' : ''}"
											>
										</div>
										<input type="text" name="keterangan[]" placeholder="Keterangan (Kondisi/Ket)" class="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs outline-none">
									</div>
									{#if row.jumlah > (data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0)}
										<p class="text-[9px] text-red-500 font-bold italic mt-1">⚠️ Stok pusat tidak cukup ({data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0})</p>
									{/if}
								</div>
							{/each}
							{#if materialRows.length === 0}
								<div class="text-center py-6 text-xs text-gray-400 italic bg-white rounded-lg border border-dashed border-gray-200">
									Belum ada rincian barang. Klik "+ TAMBAH BARIS" untuk menambahkan.
								</div>
							{/if}
						</div>
					</div>

					<!-- Foto Dokumentasi (UP3) -->
					<div class="space-y-1.5 border-t border-gray-100 pt-4">
						<label class="block text-sm font-bold text-[#0A417A]">
							Foto Dokumentasi Serah Terima
							<span class="text-red-500 ml-1">*</span>
							<span class="text-[10px] font-normal text-red-500 ml-1">(Wajib diisi)</span>
						</label>
						<div class="flex items-center gap-4">
							<label class="cursor-pointer bg-white text-gray-700 px-4 py-2 rounded-lg font-bold border {fileBase64 ? 'border-green-400' : 'border-red-300'} shadow-sm inline-flex items-center hover:bg-gray-50 transition-all text-xs">
								<svg class="w-4 h-4 mr-2 {fileBase64 ? 'text-green-600' : 'text-red-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
								Upload Foto
								<input type="file" accept="image/*" capture="environment" class="hidden" onchange={(e) => handleFileChange(e, 'PHOTO')} />
							</label>
							{#if fileBase64}
								<span class="text-xs text-green-600 font-bold italic animate-pulse">✓ Foto Dokumentasi Siap!</span>
							{:else}
								<span class="text-xs text-red-500 font-semibold italic">⚠ Foto belum diupload</span>
							{/if}
							<input type="hidden" name="photoBase64" value={fileBase64}>
						</div>
					</div>

					<div class="flex gap-4 mt-auto">
						{#if selectedRequestId}
							<button type="submit" formaction="?/tolakPermintaan" formnovalidate class="w-1/3 bg-red-500 hover:bg-red-600 text-white font-black text-sm py-4 rounded-xl shadow-lg disabled:opacity-50" disabled={isSubmitting}>
								TOLAK PERMINTAAN
							</button>
						{/if}
						<button
							type="submit"
							class="flex-1 bg-[#FFD500] hover:bg-[#FFAB00] text-[#0A417A] font-black text-lg py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
							disabled={isSubmitting || !fileBase64}
							title={!fileBase64 ? 'Upload foto dokumentasi serah terima terlebih dahulu' : ''}
						>
							{#if isSubmitting}
								<div class="flex items-center justify-center">
									<svg class="animate-spin h-6 w-6 mr-3 border-4 border-[#0A417A] border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
									MEMPROSES...
								</div>
							{:else if !fileBase64}
								📷 Upload Foto Dulu
							{:else}
								PROSES TRANSFER
							{/if}
						</button>
					</div>
				</form>

				{:else if up3ActiveTab === 'PEMAKAIAN'}
					<div class="flex-1 flex flex-col space-y-6">
						<h2 class="text-xl font-bold text-[#0A417A] mb-2 font-black italic tracking-tighter uppercase">Input Pemakaian Lapangan (UP3)</h2>
						
						<form method="POST" action="?/penggunaan" use:enhance={handleEnhance} class="space-y-6">
							<!-- Header Info -->
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-[10px] font-black text-[#0A417A] uppercase tracking-widest pl-1">Tanggal Pasang</label>
									<input type="date" name="tanggal" required class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500 bg-white shadow-sm">
								</div>
								<div class="space-y-1.5">
									<label class="text-[10px] font-black text-[#0A417A] uppercase tracking-widest pl-1">Nama Petugas</label>
									<input type="text" name="takerName" placeholder="Nama Teknisi/Petugas" required class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500 bg-white shadow-sm">
								</div>
							</div>

							<div class="space-y-1.5">
								<label class="text-[10px] font-black text-[#0A417A] uppercase tracking-widest pl-1">Tujuan / Nomor SPK</label>
								<input type="text" name="usagePurpose" placeholder="Contoh: Perbaikan Trafo Gardu / SPK-UP3-2026-001" required class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500 bg-white shadow-sm font-bold text-gray-700">
							</div>
							
							<!-- Material List -->
							<div class="border border-gray-200 p-5 rounded-2xl bg-gray-50/50 shadow-inner">
								<div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
									<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Rincian Material Terpasang</span>
									<button type="button" onclick={addMaterialRow} class="text-[10px] font-black bg-[#FFD500] text-[#0A417A] px-3 py-1 rounded-lg shadow-sm hover:scale-105 transition-all border border-yellow-500">+ TAMBAH</button>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div class="p-4 border border-gray-200 rounded-2xl bg-white relative shadow-md hover:shadow-lg transition-shadow">
											<div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
												<span class="text-[9px] font-black text-[#0A417A] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Item #{i + 1}</span>
												{#if materialRows.length > 1}
													<button type="button" onclick={() => removeMaterialRow(i)} class="text-red-400 hover:text-red-600 transition-colors p-1">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pilih Material</label>
													<select 
														name="materialId[]" 
														bind:value={row.materialId}
														required 
														class="w-full border-b-2 border-gray-100 text-sm outline-none bg-transparent font-black text-[#0A417A] cursor-pointer focus:border-cyan-500 py-1 transition-colors"
													>
														<option value="">Pilih Material...</option>
														{#each data.materials as mat}
															<option value={mat.id.toString()} disabled={mat.stock <= 0}>
																{mat.name} ({mat.unit}) — [SISA: {mat.stock}]
															</option>
														{/each}
													</select>
												</div>

												<div class="flex gap-4 items-start">
													<!-- Quantity -->
													<div class="w-24">
														<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Jumlah</label>
														<div class="flex items-center gap-1">
															<input 
																type="number" 
																name="jumlah[]" 
																placeholder="0" 
																bind:value={row.jumlah}
																required 
																min="1"
																max={data.materials.find(m => m.id.toString() === row.materialId)?.stock || 1000000}
																class="w-full border-b-2 border-gray-100 rounded px-1 py-1 text-sm text-center font-black text-[#0A417A] outline-none focus:border-cyan-500 transition-colors {row.jumlah > (data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0) ? 'text-red-500 border-red-200 bg-red-50' : ''}"
															>
															<span class="text-[10px] font-bold text-gray-400 truncate">{data.materials.find(m => m.id.toString() === row.materialId)?.unit || ''}</span>
														</div>
														{#if row.jumlah > (data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0)}
															<span class="text-[8px] text-red-500 font-bold block mt-1 tracking-tighter">SISA: {data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0}</span>
														{/if}
													</div>

													<!-- Keterangan -->
													<div class="flex-1">
														<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Keterangan / Catatan Lapangan</label>
														<input 
															type="text" 
															name="keterangan[]" 
															placeholder="Contoh: Kondisi fisik material baik..." 
															class="w-full border-b-2 border-gray-100 py-1 text-sm text-gray-700 outline-none focus:border-cyan-500 transition-colors italic font-medium"
														>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Photo Upload Section -->
							<div class="bg-blue-50 border-2 border-dashed border-blue-200 p-6 rounded-2xl flex flex-col items-center">
								<p class="text-[10px] font-black text-blue-800 uppercase mb-4 italic tracking-widest text-center">Lampirkan Foto Bukti Pemasangan (Opsional untuk Draf, Wajib untuk Konfirmasi)</p>
								<div class="flex items-center gap-6">
									<label class="cursor-pointer bg-white text-blue-700 px-6 py-3 rounded-xl font-black border-2 border-blue-300 shadow-md inline-flex items-center hover:bg-blue-100 transition-all text-xs">
										<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
										AMBIL FOTO LAPANGAN
										<input type="file" accept="image/*" capture="environment" class="hidden" onchange={(e) => handleFileChange(e, 'PHOTO')} />
									</label>
									{#if fileBase64}
										<div class="flex items-center text-green-600 font-black italic text-xs animate-bounce">
											<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
											Foto Terlampir
										</div>
									{:else}
										<div class="text-gray-400 font-bold italic text-xs">Belum ada foto</div>
									{/if}
									<input type="hidden" name="photoBase64" value={fileBase64}>
								</div>
							</div>

							<!-- Two Action Buttons -->
							<div class="grid grid-cols-2 gap-4 mt-8">
								<button 
									type="submit" 
									name="targetStatus" 
									value="DRAFT"
									class="bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-sm py-4 rounded-xl border-2 border-gray-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
									disabled={isSubmitting}
								>
									{#if isSubmitting} MEMPROSES... {:else} SIMPAN DRAF {/if}
								</button>
								<button 
									type="submit" 
									name="targetStatus" 
									value="COMPLETED"
									class="bg-green-500 hover:bg-green-600 text-white font-black text-sm py-4 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
									disabled={isSubmitting}
								>
									{#if isSubmitting} MEMPROSES... {:else} KONFIRMASI PEMAKAIAN {/if}
								</button>
							</div>
							<p class="text-[10px] text-gray-400 font-medium italic text-center">*Foto bukti bersifat opsional.</p>
						</form>
					</div>

				{:else if up3ActiveTab === 'STOK_AWAL'}
					<div class="flex-1 flex flex-col space-y-6">
						<h2 class="text-xl font-bold text-[#0A417A] mb-2 font-black italic tracking-tighter uppercase">Input Stok Awal Pusat (UP3)</h2>
						
						<form method="POST" action="?/stokAwal" use:enhance={handleEnhance} class="space-y-6 flex-1 flex flex-col">
							<!-- Material List -->
							<div class="border border-gray-200 p-5 rounded-2xl bg-gray-50/50 shadow-inner flex-1">
								<div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
									<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Rincian Material Stok Awal Pusat</span>
									<button type="button" onclick={addMaterialRow} class="text-[10px] font-black bg-[#FFD500] text-[#0A417A] px-3 py-1 rounded-lg shadow-sm hover:scale-105 transition-all border border-yellow-500">+ TAMBAH</button>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div class="p-4 border border-gray-200 rounded-2xl bg-white relative shadow-sm">
											<div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
												<span class="text-[9px] font-black text-[#0A417A] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Item #{i + 1}</span>
												{#if materialRows.length > 1}
													<button type="button" onclick={() => removeMaterialRow(i)} class="text-red-400 hover:text-red-600 transition-colors p-1">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pilih Material</label>
													<select 
														name="materialId[]" 
														bind:value={row.materialId}
														required 
														class="w-full border-b-2 border-gray-100 text-sm outline-none bg-transparent font-black text-[#0A417A] cursor-pointer focus:border-cyan-500 py-1 transition-colors"
													>
														<option value="">Pilih Material...</option>
														{#each data.materials.filter(m => !m.hasStockRecord) as mat}
															<option value={mat.id.toString()}>
																{mat.name} ({mat.unit})
															</option>
														{/each}
													</select>
												</div>

												<div class="flex gap-4 items-start">
													<!-- Quantity -->
													<div class="w-full">
														<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Jumlah Fisik Saat Ini</label>
														<div class="flex items-center gap-2">
															<input 
																type="number" 
																name="jumlah[]" 
																placeholder="0" 
																bind:value={row.jumlah}
																required 
																min="0"
																class="flex-1 border-b-2 border-gray-100 rounded px-2 py-1 text-sm font-black text-[#0A417A] outline-none focus:border-cyan-500 transition-colors"
															>
															<span class="text-[10px] font-bold text-gray-400 truncate w-16">{data.materials.find(m => m.id.toString() === row.materialId)?.unit || ''}</span>
														</div>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<button 
								type="submit" 
								class="w-full bg-[#0188CE] hover:bg-blue-600 text-white font-black text-lg py-4 rounded-xl shadow-lg mt-auto disabled:opacity-50"
								disabled={isSubmitting}
							>
								{#if isSubmitting}
									MEMPROSES...
								{:else}
									SIMPAN STOK AWAL
								{/if}
							</button>
						</form>
					</div>
				{:else if up3ActiveTab === 'KONFIRMASI_STOK'}
					{@const pendingStocks = (data.requestedTransactions || []).filter(t => t.type === 'INITIAL_STOCK')}
					{@const groupedStocks = pendingStocks.reduce((acc, trx) => {
						if (!acc[trx.ulpName]) acc[trx.ulpName] = [];
						acc[trx.ulpName].push(trx);
						return acc;
					}, {} as Record<string, typeof pendingStocks>)}
					<div class="flex-1 flex flex-col space-y-6">
						<h2 class="text-xl font-bold text-[#0A417A] mb-2 font-black italic tracking-tighter uppercase">Persetujuan Stok Awal ULP</h2>
						
						{#if pendingStocks && pendingStocks.length > 0}
							<div class="space-y-6 flex-1 overflow-y-auto pr-2 custom-scroll max-h-[550px]">
								{#each Object.entries(groupedStocks) as [ulpName, transactions]}
									<div class="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
										<!-- Group Header -->
										<div class="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
											<div class="flex items-center gap-3">
												<div class="bg-white p-1.5 rounded-lg shadow-sm border border-gray-100">
													<svg class="w-5 h-5 text-[#0188CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
												</div>
												<h3 class="font-black text-[#0A417A] text-sm uppercase tracking-widest">{ulpName}</h3>
											</div>
											<span class="bg-[#0A417A] text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">{transactions.length} Pengajuan</span>
										</div>
										
										<!-- Group Content (Requests) -->
										<div class="p-5 space-y-5 bg-gray-50/30">
											{#each transactions as trx}
												<div class="border border-yellow-200 rounded-xl p-5 shadow-sm bg-white relative transition-all hover:shadow-md">
													<div class="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
														<div>
															<p class="text-[10px] font-black text-gray-400 italic">No. Referensi: <span class="text-gray-600">{trx.referenceNumber}</span></p>
															<p class="text-[10px] font-bold text-gray-400 italic">Tanggal: {new Date(trx.date).toLocaleDateString('id-ID')}</p>
														</div>
														<span class="bg-yellow-400 text-[#0A417A] text-[8px] font-black px-2 py-1 rounded shadow-sm">BUTUH PERSETUJUAN</span>
													</div>

													<div class="space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-5 shadow-inner">
														<p class="text-[9px] font-black text-gray-400 uppercase mb-3">Rincian Material yang Diajukan:</p>
														{#each trx.items as item}
															<div class="flex justify-between items-center text-xs font-bold text-gray-700 border-b border-gray-100 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
																<span class="uppercase">{item.name}</span>
																<span class="text-[#0A417A] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{item.quantity} Unit</span>
															</div>
														{/each}
													</div>

													<div class="flex gap-3 mt-4">
														<form method="POST" action="?/tolakStokAwal" use:enhance={handleEnhance} class="flex-1">
															<input type="hidden" name="transactionId" value={trx.id} />
															<button class="w-full text-[11px] bg-red-500 text-white font-black py-2.5 rounded-xl shadow-sm hover:bg-red-600 transition-all disabled:opacity-50" disabled={isSubmitting}>
																{#if isSubmitting}
																	MEMPROSES...
																{:else}
																	TOLAK DATA
																{/if}
															</button>
														</form>
														<form method="POST" action="?/konfirmasiStokAwal" use:enhance={handleEnhance} class="flex-1">
															<input type="hidden" name="transactionId" value={trx.id} />
															<button class="w-full text-[11px] bg-green-500 text-white font-black py-2.5 rounded-xl shadow-sm hover:bg-green-600 transition-all disabled:opacity-50" disabled={isSubmitting}>
																{#if isSubmitting}
																	MEMPROSES...
																{:else}
																	TERIMA STOK
																{/if}
															</button>
														</form>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="flex-1 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 min-h-[300px]">
								<svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
								<p class="text-sm font-bold text-gray-400">Tidak ada pengajuan stok awal dari ULP yang menunggu persetujuan.</p>
							</div>
						{/if}
					</div>
				{/if}

			{:else}
				<!-- TABS BAGI ULP -->
				<div class="flex border-b border-gray-200 mb-6 bg-gray-50 p-1 rounded-t-lg">
					<button class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {ulpActiveTab === 'PERMINTAAN' ? 'bg-white text-[#0A417A] shadow-sm rounded-md' : 'text-gray-400 hover:text-gray-600'}" onclick={() => ulpActiveTab = 'PERMINTAAN'}>
						PERMINTAAN
					</button>
					<button class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {ulpActiveTab === 'PEMAKAIAN' ? 'bg-white text-[#0A417A] shadow-sm rounded-md' : 'text-gray-400 hover:text-gray-600'}" onclick={() => ulpActiveTab = 'PEMAKAIAN'}>
						PEMAKAIAN
					</button>
					{#if data.materials.filter(m => !m.hasStockRecord).length > 0 || ulpActiveTab === 'STOK_AWAL'}
						<button class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {ulpActiveTab === 'STOK_AWAL' ? 'bg-white text-[#0A417A] shadow-sm rounded-md' : 'text-gray-400 hover:text-gray-600'}" onclick={() => ulpActiveTab = 'STOK_AWAL'}>
							STOK AWAL
						</button>
					{/if}
				</div>

				{#if ulpActiveTab === 'PERMINTAAN'}
					<h2 class="text-xl font-bold text-[#0A417A] mb-8">Pengajuan Permintaan Material</h2>
					<form method="POST" action="?/minta" use:enhance={handleEnhance} class="space-y-6 flex-1 flex flex-col">
						
						<!-- Input Petugas -->
						<div class="border border-gray-200 p-5 rounded-2xl bg-gray-50/50 shadow-inner">
							<label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nama Petugas Pengambil / Penanggung Jawab</label>
							<input type="text" name="takerName" placeholder="Contoh: Budi (Akan ke Gudang UP3)" required class="w-full border-b-2 border-gray-200 py-2 text-sm font-black text-[#0A417A] outline-none bg-transparent focus:border-cyan-500 transition-colors">
						</div>

						<!-- Material List -->
						<div class="border border-gray-200 p-5 rounded-2xl bg-gray-50/50 shadow-inner">
							<div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
								<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Rincian Material yang Diajukan</span>
								<button type="button" onclick={addMaterialRow} class="text-[10px] font-black bg-[#FFD500] text-[#0A417A] px-3 py-1 rounded-lg shadow-sm hover:scale-105 transition-all border border-yellow-500">+ TAMBAH</button>
							</div>
							<div class="space-y-3">
								{#each materialRows as row, i}
									<div class="p-4 border border-gray-200 rounded-2xl bg-white relative shadow-md hover:shadow-lg transition-shadow">
										<div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
											<span class="text-[9px] font-black text-[#0A417A] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Item #{i + 1}</span>
											{#if materialRows.length > 1}
												<button type="button" onclick={() => removeMaterialRow(i)} class="text-red-400 hover:text-red-600 transition-colors p-1">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
												</button>
											{/if}
										</div>

										<div class="space-y-4">
											<!-- Material Select -->
											<div>
												<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pilih Material</label>
												<select 
													name="materialId[]" 
													bind:value={row.materialId}
													required 
													class="w-full border-b-2 border-gray-100 text-sm outline-none bg-transparent font-black text-[#0A417A] cursor-pointer focus:border-cyan-500 py-1 transition-colors"
												>
													<option value="">Pilih Material...</option>
													{#each data.materials as mat}
														<option value={mat.id.toString()}>
															{mat.name} ({mat.up3Stock} {mat.unit.toLowerCase()})
														</option>
													{/each}
												</select>
											</div>

											<div class="flex gap-4 items-start">
												<!-- Quantity -->
												<div class="w-24">
													<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Jumlah</label>
													<div class="flex items-center gap-1">
														<input 
															type="number" 
															name="jumlah[]" 
															placeholder="0" 
															bind:value={row.jumlah}
															required 
															min="1"
															class="w-full border-b-2 border-gray-100 rounded px-1 py-1 text-sm text-center font-black text-[#0A417A] outline-none focus:border-cyan-500 transition-colors"
														>
														<span class="text-[10px] font-bold text-gray-400 truncate">{data.materials.find(m => m.id.toString() === row.materialId)?.unit || ''}</span>
													</div>
												</div>

												<!-- Keterangan -->
												<div class="flex-1">
													<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Keterangan (Opsional)</label>
													<input 
														type="text" 
														name="keterangan[]" 
														placeholder="Alasan permintaan..." 
														class="w-full border-b-2 border-gray-100 py-1 text-sm text-gray-700 outline-none focus:border-cyan-500 transition-colors italic font-medium"
													>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Photo Upload Section -->
						<div class="bg-cyan-50 border-2 border-dashed border-cyan-300 p-6 rounded-2xl flex flex-col items-center mt-6">
							<p class="text-[10px] font-black text-cyan-800 uppercase mb-4 italic tracking-widest text-center">Lampirkan Surat Permintaan (Opsional)</p>
							<div class="flex items-center gap-6">
								<label class="cursor-pointer bg-white text-cyan-700 px-6 py-3 rounded-xl font-black border-2 border-cyan-300 shadow-md inline-flex items-center hover:bg-cyan-100 transition-all text-xs">
									<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12"></path></svg>
									PILIH FILE SURAT
									<input type="file" accept="image/*,application/pdf" class="hidden" onchange={(e) => handleFileChange(e, 'LETTER')} />
								</label>
								{#if requestLetterBase64}
									<div class="flex items-center text-green-600 font-black italic text-xs animate-bounce">
										<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
										Surat Terlampir
									</div>
								{:else}
									<div class="text-gray-400 font-bold italic text-xs">Belum ada file</div>
								{/if}
								<input type="hidden" name="letterBase64" value={requestLetterBase64}>
							</div>
						</div>

						<button type="submit" class="w-full bg-[#0188CE] hover:bg-blue-600 text-white font-black text-lg py-4 rounded-xl shadow-lg mt-auto disabled:opacity-50" disabled={isSubmitting}>
							{#if isSubmitting}
								MEMPROSES...
							{:else}
								AJUKAN PERMINTAAN
							{/if}
						</button>
					</form>


				{:else if ulpActiveTab === 'PEMAKAIAN'}
					<div class="flex-1 flex flex-col space-y-6">
						<h2 class="text-xl font-bold text-[#0A417A] mb-2 font-black italic tracking-tighter uppercase">Input Pemakaian Lapangan</h2>
						
						<form method="POST" action="?/penggunaan" use:enhance={handleEnhance} class="space-y-6">
							<!-- Header Info -->
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-[10px] font-black text-[#0A417A] uppercase tracking-widest pl-1">Tanggal Pasang</label>
									<input type="date" name="tanggal" required class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500 bg-white shadow-sm">
								</div>
								<div class="space-y-1.5">
									<label class="text-[10px] font-black text-[#0A417A] uppercase tracking-widest pl-1">Nama Petugas</label>
									<input type="text" name="takerName" placeholder="Nama Teknisi" required class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500 bg-white shadow-sm">
								</div>
							</div>

							<div class="space-y-1.5">
								<label class="text-[10px] font-black text-[#0A417A] uppercase tracking-widest pl-1">Tujuan / Nomor SPK</label>
								<input type="text" name="usagePurpose" placeholder="Contoh: Perbaikan Gardu GT-01 / SPK-2023-001" required class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500 bg-white shadow-sm font-bold text-gray-700">
							</div>
							
							<!-- Material List -->
							<div class="border border-gray-200 p-5 rounded-2xl bg-gray-50/50 shadow-inner">
								<div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
									<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Rincian Material Terpasang</span>
									<button type="button" onclick={addMaterialRow} class="text-[10px] font-black bg-[#FFD500] text-[#0A417A] px-3 py-1 rounded-lg shadow-sm hover:scale-105 transition-all border border-yellow-500">+ TAMBAH</button>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div class="p-4 border border-gray-200 rounded-2xl bg-white relative shadow-md hover:shadow-lg transition-shadow">
											<div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
												<span class="text-[9px] font-black text-[#0A417A] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Item #{i + 1}</span>
												{#if materialRows.length > 1}
													<button type="button" onclick={() => removeMaterialRow(i)} class="text-red-400 hover:text-red-600 transition-colors p-1">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pilih Material</label>
													<select 
														name="materialId[]" 
														bind:value={row.materialId}
														required 
														class="w-full border-b-2 border-gray-100 text-sm outline-none bg-transparent font-black text-[#0A417A] cursor-pointer focus:border-cyan-500 py-1 transition-colors"
													>
														<option value="">Pilih Material...</option>
														{#each data.materials as mat}
															<option value={mat.id.toString()} disabled={mat.stock <= 0}>
																{mat.name} ({mat.unit}) — [SISA: {mat.stock}]
															</option>
														{/each}
													</select>
												</div>

												<div class="flex gap-4 items-start">
													<!-- Quantity -->
													<div class="w-24">
														<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Jumlah</label>
														<div class="flex items-center gap-1">
															<input 
																type="number" 
																name="jumlah[]" 
																placeholder="0" 
																bind:value={row.jumlah}
																required 
																min="1"
																max={data.materials.find(m => m.id.toString() === row.materialId)?.stock || 1000000}
																class="w-full border-b-2 border-gray-100 rounded px-1 py-1 text-sm text-center font-black text-[#0A417A] outline-none focus:border-cyan-500 transition-colors {row.jumlah > (data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0) ? 'text-red-500 border-red-200 bg-red-50' : ''}"
															>
															<span class="text-[10px] font-bold text-gray-400 truncate">{data.materials.find(m => m.id.toString() === row.materialId)?.unit || ''}</span>
														</div>
														{#if row.jumlah > (data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0)}
															<span class="text-[8px] text-red-500 font-bold block mt-1 tracking-tighter">SISA: {data.materials.find(m => m.id.toString() === row.materialId)?.stock || 0}</span>
														{/if}
													</div>

													<!-- Keterangan -->
													<div class="flex-1">
														<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Keterangan / Catatan Lapangan</label>
														<input 
															type="text" 
															name="keterangan[]" 
															placeholder="Contoh: Kondisi fisik material baik..." 
															class="w-full border-b-2 border-gray-100 py-1 text-sm text-gray-700 outline-none focus:border-cyan-500 transition-colors italic font-medium"
														>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Photo Upload Section -->
							<div class="bg-blue-50 border-2 border-dashed border-blue-200 p-6 rounded-2xl flex flex-col items-center">
								<p class="text-[10px] font-black text-blue-800 uppercase mb-4 italic tracking-widest text-center">Lampirkan Foto Bukti Pemasangan (Opsional untuk Draf, Wajib untuk Konfirmasi)</p>
								<div class="flex items-center gap-6">
									<label class="cursor-pointer bg-white text-blue-700 px-6 py-3 rounded-xl font-black border-2 border-blue-300 shadow-md inline-flex items-center hover:bg-blue-100 transition-all text-xs">
										<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
										AMBIL FOTO LAPANGAN
										<input type="file" accept="image/*" capture="environment" class="hidden" onchange={(e) => handleFileChange(e, 'PHOTO')} />
									</label>
									{#if fileBase64}
										<div class="flex items-center text-green-600 font-black italic text-xs animate-bounce">
											<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
											Foto Terlampir
										</div>
									{:else}
										<div class="text-gray-400 font-bold italic text-xs">Belum ada foto</div>
									{/if}
									<input type="hidden" name="photoBase64" value={fileBase64}>
								</div>
							</div>

							<!-- Two Action Buttons -->
							<div class="grid grid-cols-2 gap-4 mt-8">
								<button 
									type="submit" 
									name="targetStatus" 
									value="DRAFT"
									class="bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-sm py-4 rounded-xl border-2 border-gray-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
									disabled={isSubmitting}
								>
									{#if isSubmitting} MEMPROSES... {:else} SIMPAN DRAF {/if}
								</button>
								<button 
									type="submit" 
									name="targetStatus" 
									value="COMPLETED"
									class="bg-green-500 hover:bg-green-600 text-white font-black text-sm py-4 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
									disabled={isSubmitting}
								>
									{#if isSubmitting} MEMPROSES... {:else} KONFIRMASI PEMAKAIAN {/if}
								</button>
							</div>
							<p class="text-[10px] text-gray-400 font-medium italic text-center">*Foto bukti bersifat opsional.</p>
						</form>
					</div>
				{:else if ulpActiveTab === 'STOK_AWAL'}
					<div class="flex-1 flex flex-col space-y-6">
						<h2 class="text-xl font-bold text-[#0A417A] mb-2 font-black italic tracking-tighter uppercase">Input Stok Awal ULP</h2>
						
						<form method="POST" action="?/stokAwal" use:enhance={handleEnhance} class="space-y-6 flex-1 flex flex-col">
							<!-- Material List -->
							<div class="border border-gray-200 p-5 rounded-2xl bg-gray-50/50 shadow-inner flex-1">
								<div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
									<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Rincian Material Stok Awal</span>
									<button type="button" onclick={addMaterialRow} class="text-[10px] font-black bg-[#FFD500] text-[#0A417A] px-3 py-1 rounded-lg shadow-sm hover:scale-105 transition-all border border-yellow-500">+ TAMBAH</button>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div class="p-4 border border-gray-200 rounded-2xl bg-white relative shadow-sm">
											<div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
												<span class="text-[9px] font-black text-[#0A417A] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Item #{i + 1}</span>
												{#if materialRows.length > 1}
													<button type="button" onclick={() => removeMaterialRow(i)} class="text-red-400 hover:text-red-600 transition-colors p-1">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pilih Material</label>
													<select 
														name="materialId[]" 
														bind:value={row.materialId}
														required 
														class="w-full border-b-2 border-gray-100 text-sm outline-none bg-transparent font-black text-[#0A417A] cursor-pointer focus:border-cyan-500 py-1 transition-colors"
													>
														<option value="">Pilih Material...</option>
														{#each data.materials.filter(m => !m.hasStockRecord) as mat}
															<option value={mat.id.toString()}>
																{mat.name} ({mat.unit})
															</option>
														{/each}
													</select>
												</div>

												<div class="flex gap-4 items-start">
													<!-- Quantity -->
													<div class="w-full">
														<label class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Jumlah Fisik Saat Ini</label>
														<div class="flex items-center gap-2">
															<input 
																type="number" 
																name="jumlah[]" 
																placeholder="0" 
																bind:value={row.jumlah}
																required 
																min="0"
																class="flex-1 border-b-2 border-gray-100 rounded px-2 py-1 text-sm font-black text-[#0A417A] outline-none focus:border-cyan-500 transition-colors"
															>
															<span class="text-[10px] font-bold text-gray-400 truncate w-16">{data.materials.find(m => m.id.toString() === row.materialId)?.unit || ''}</span>
														</div>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<button 
								type="submit" 
								class="w-full bg-[#0188CE] hover:bg-blue-600 text-white font-black text-lg py-4 rounded-xl shadow-lg mt-auto disabled:opacity-50"
								disabled={isSubmitting}
							>
								{#if isSubmitting}
									MEMPROSES...
								{:else}
									AJUKAN STOK AWAL
								{/if}
							</button>
						</form>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	/* Layout Styles */
</style>
