<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { loadingState } from '$lib/loadingState.svelte';

	let { data, form } = $props();

	let fileBase64 = $state(''); // For documentation photo (UP3)
	let pemakaianPhotos = $state<string[]>([]); // For installation photo (ULP/UP3 usage)
	let requestLetterBase64 = $state(''); // For request letter (ULP)
	let isSubmitting = $state(false);

	function handleEnhance({ action }: { action: URL }) {
		isSubmitting = true;
		loadingState.start('Memproses Transaksi...', 3000);
		const startTime = Date.now();

		return async ({ result, update }: { result: any; update: any }) => {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, 2000 - elapsed);

			// Ensure it takes at least 2 seconds
			if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

			isSubmitting = false;
			loadingState.stop();

			if (result.type === 'success') {
				// Reset specific states based on the action
				if (action.search.includes('minta')) requestLetterBase64 = '';
				if (action.search.includes('draft')) {
					fileBase64 = '';
					selectedRequestId = '';
				}
				if (action.search.includes('penggunaan')) {
					pemakaianPhotos = [];
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

	async function handleFileChange(event: Event, type: 'PHOTO' | 'LETTER' | 'PEMAKAIAN') {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			for (let i = 0; i < input.files.length; i++) {
				const file = input.files[i];
				if (file.type.startsWith('image/')) {
					try {
						const result = await compressImage(file);
						if (type === 'PHOTO') fileBase64 = result;
						else if (type === 'LETTER') requestLetterBase64 = result;
						else if (type === 'PEMAKAIAN') pemakaianPhotos = [...pemakaianPhotos, result];
					} catch (e) {
						console.error('Compression failed:', e);
					}
				} else {
					const reader = new FileReader();
					reader.onload = (e) => {
						if (type === 'PHOTO') fileBase64 = e.target?.result as string;
						else if (type === 'LETTER') requestLetterBase64 = e.target?.result as string;
						else if (type === 'PEMAKAIAN')
							pemakaianPhotos = [...pemakaianPhotos, e.target?.result as string];
					};
					reader.readAsDataURL(file);
				}
			}
		}
	}

	// Dynamic Materials Array State
	let materialRows = $state([
		{ materialId: '', jumlah: '', keterangan: '', searchQuery: '', showDropdown: false }
	]);

	function addMaterialRow() {
		materialRows = [
			...materialRows,
			{ materialId: '', jumlah: '', keterangan: '', searchQuery: '', showDropdown: false }
		];
	}

	function removeMaterialRow(index: number) {
		materialRows = materialRows.filter((_, i) => i !== index);
	}

	function getFilteredMaterials(searchQuery: string, materialId: string, list: any[]) {
		const selectedMat = list.find((m) => m.id.toString() === materialId);
		if (!searchQuery || (selectedMat && searchQuery === selectedMat.name)) {
			return list;
		}
		const query = searchQuery.toLowerCase();
		return list.filter((m) => m.name.toLowerCase().includes(query));
	}

	function handleBlur(row: any, list: any[]) {
		setTimeout(() => {
			row.showDropdown = false;
			const matched = list.find((m) => m.name === row.searchQuery);
			if (matched) {
				row.materialId = matched.id.toString();
				row.searchQuery = matched.name;
			} else {
				row.materialId = '';
				row.searchQuery = '';
			}
		}, 200);
	}

	// Tabs for ULP & UP3
	let ulpActiveTab = $state($page.url.searchParams.get('tab') || 'PERMINTAAN'); // PERMINTAAN | VERIFIKASI | PEMAKAIAN | STOK_AWAL
	let up3ActiveTab = $state($page.url.searchParams.get('tab') || 'TRANSFER'); // TRANSFER | PEMAKAIAN | STOK_AWAL | KONFIRMASI_STOK

	// Selected Pending Verifikasi State (ULP)
	let selectedVerifId = $state('');
	let selectedVerifData = $derived(
		(data.pendingVerifikasi || []).find(
			(v: any) => v.id.toString() === selectedVerifId?.toString()
		) || null
	);

	// Selected Draft Usage State (ULP)
	let selectedUsageDraftId = $state('');
	let selectedUsageDraftData = $derived(
		(data.draftUsages || []).find(
			(d: any) => d.id.toString() === selectedUsageDraftId?.toString()
		) || null
	);

	// Selected Request State (UP3)
	let selectedRequestId = $state('');
	let selectedRequestData = $derived(
		(data.requestedTransactions || []).find(
			(r: any) => r.id.toString() === selectedRequestId?.toString()
		) || null
	);

	// Taker Name State for UP3
	let up3TakerName = $state('');
	let up3FirstParty = $state('');

	function handleRequestChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const val = select.value;
		selectedRequestId = val;

		const reqData =
			(data.requestedTransactions || []).find((r: any) => r.id.toString() === val) || null;

		if (val && reqData) {
			if (reqData.items && reqData.items.length > 0) {
				materialRows = reqData.items.map((item: any) => {
					const mat = (data.materials ?? []).find(
						(m: any) => m.id.toString() === item.materialId.toString()
					);
					return {
						materialId: item.materialId.toString(),
						jumlah: item.jumlah,
						keterangan: item.keterangan || '',
						searchQuery: mat ? mat.name : '',
						showDropdown: false
					};
				});
			}
			up3TakerName = reqData.takerName || '';
		} else if (val === '') {
			materialRows = [
				{ materialId: '', jumlah: '', keterangan: '', searchQuery: '', showDropdown: false }
			];
			up3TakerName = '';
			up3FirstParty = '';
		}
	}
</script>

<svelte:head>
	<title>Transaksi Material - PLN Gudang</title>
</svelte:head>

<div class="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-4xl flex-col px-2 pb-10">
	<!-- LEFT PANEL: Dynamic Form -->
	<div
		class="flex min-h-[650px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
	>
		<div
			class="relative flex shrink-0 items-center overflow-hidden bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4] p-4 text-white"
		>
			<svg
				class="absolute inset-0 h-full w-full opacity-30"
				preserveAspectRatio="none"
				viewBox="0 0 100 20"
			>
				<path d="M-10,30 L60,-10 L70,-10 L0,30 Z" fill="rgba(255,255,255,0.2)"></path>
			</svg>
			<img
				src="/logo-icon.png"
				class="relative z-10 mr-3 h-12 w-auto shrink-0 object-contain drop-shadow-md"
				alt="Logo PLN"
			/>
			<div
				class="relative z-10 flex flex-1 items-center justify-between text-lg leading-tight font-bold"
			>
				<div>PLN <span class="ml-1 text-sm font-normal opacity-90">Transaksi Material</span></div>
			</div>
		</div>

		<div class="flex flex-1 flex-col p-8">
			{#if form?.success}
				<div
					class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
				>
					✅ {form.message}
				</div>
			{/if}
			{#if form?.error}
				<div
					class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
				>
					⚠️ {form.error}
				</div>
			{/if}

			{#if data.userRole === 'ADMIN_UP3'}
				<div class="mb-6 flex rounded-t-lg border-b border-gray-200 bg-gray-50 p-1">
					<button
						class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab ===
						'TRANSFER'
							? 'rounded-md bg-white text-[#0A417A] shadow-sm'
							: 'text-gray-400 hover:text-gray-600'}"
						onclick={() => {
							up3ActiveTab = 'TRANSFER';
							materialRows = [
								{ materialId: '', jumlah: '', keterangan: '', searchQuery: '', showDropdown: false }
							];
							selectedRequestId = '';
						}}
					>
						TRANSFER MATERIAL
						{#if (data.requestedTransactions || []).filter((t) => t.type !== 'INITIAL_STOCK').length > 0}
							<span class="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] text-white">
								{(data.requestedTransactions || []).filter((t) => t.type !== 'INITIAL_STOCK')
									.length}
							</span>
						{/if}
					</button>
					<button
						class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab ===
						'PEMAKAIAN'
							? 'rounded-md bg-white text-[#0A417A] shadow-sm'
							: 'text-gray-400 hover:text-gray-600'}"
						onclick={() => {
							up3ActiveTab = 'PEMAKAIAN';
							materialRows = [
								{ materialId: '', jumlah: '', keterangan: '', searchQuery: '', showDropdown: false }
							];
						}}
					>
						PEMAKAIAN LAPANGAN
					</button>
					{#if (data.materials ?? []).filter((m) => !m.hasStockRecord).length > 0 || up3ActiveTab === 'STOK_AWAL'}
						<button
							class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab ===
							'STOK_AWAL'
								? 'rounded-md bg-white text-[#0A417A] shadow-sm'
								: 'text-gray-400 hover:text-gray-600'}"
							onclick={() => {
								up3ActiveTab = 'STOK_AWAL';
								materialRows = [
									{
										materialId: '',
										jumlah: '',
										keterangan: '',
										searchQuery: '',
										showDropdown: false
									}
								];
							}}
						>
							INPUT STOK AWAL
						</button>
					{/if}
					{#if (data.requestedTransactions || []).filter((t) => t.type === 'INITIAL_STOCK').length > 0 || up3ActiveTab === 'KONFIRMASI_STOK'}
						<button
							class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {up3ActiveTab ===
							'KONFIRMASI_STOK'
								? 'rounded-md bg-white text-[#0A417A] shadow-sm'
								: 'text-gray-400 hover:text-gray-600'}"
							onclick={() => (up3ActiveTab = 'KONFIRMASI_STOK')}
						>
							PERSETUJUAN STOK ULP
							{#if (data.requestedTransactions || []).filter((t) => t.type === 'INITIAL_STOCK').length > 0}
								<span class="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] text-white">
									{(data.requestedTransactions || []).filter((t) => t.type === 'INITIAL_STOCK')
										.length}
								</span>
							{/if}
						</button>
					{/if}
				</div>

				{#if up3ActiveTab === 'TRANSFER'}
					<h2 class="mb-6 border-b border-gray-100 pb-2 text-xl font-bold text-[#0A417A]">
						Proses Transfer Material
					</h2>

					<form
						method="POST"
						action="?/draft"
						use:enhance={handleEnhance}
						class="flex flex-1 flex-col space-y-5"
					>
						<!-- Pilih Permintaan ULP (Opsional) -->
						<div class="space-y-1.5">
							<div class="flex items-center justify-between">
								<label for="requestId" class="block text-sm font-semibold text-[#0A417A]"
									>Pilih Permintaan ULP (Jika ada)</label
								>
								{#if selectedRequestData?.requestLetter}
									<button
										type="button"
										onclick={() => openViewer(selectedRequestData.requestLetter)}
										class="flex items-center rounded border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-600 transition-all hover:text-cyan-700"
									>
										<svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											></path><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											></path></svg
										>
										BUKA SURAT PERMINTAAN
									</button>
								{/if}
							</div>
							<select
								id="requestId"
								name="requestId"
								value={selectedRequestId}
								onchange={handleRequestChange}
								class="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 italic outline-none focus:border-cyan-500"
							>
								<option value="">-- Transfer Langsung (Tanpa Permintaan) --</option>
								{#each data.requestedTransactions.filter((r) => r.type !== 'INITIAL_STOCK') as req}
									<option value={req.id.toString()}>{req.ref} - {req.ulpName}</option>
								{/each}
							</select>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div class="space-y-1.5">
								<label for="ulpId" class="block text-sm font-semibold text-[#0A417A]"
									>Unit ULP Tujuan</label
								>
								{#if selectedRequestId}
									<input
										type="text"
										value={selectedRequestData?.ulpName}
										disabled
										class="block w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
									/>
									<input type="hidden" name="ulpId" value={selectedRequestData?.targetUlpId} />
								{:else}
									<select
										id="ulpId"
										name="ulpId"
										required
										class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
									>
										<option value="">Pilih ULP...</option>
										{#each data.ulps as ulp}
											<option value={ulp.id}>{ulp.name}</option>
										{/each}
									</select>
								{/if}
							</div>
							<div class="space-y-1.5">
								<label for="takerName" class="block text-sm font-semibold text-[#0A417A]"
									>Nama Pengambil</label
								>
								<input
									type="text"
									id="takerName"
									name="takerName"
									bind:value={up3TakerName}
									placeholder="Contoh: Budi (ULP Kota)"
									required
									class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
								/>
							</div>
							<div class="space-y-1.5">
								<label for="firstParty" class="block text-sm font-semibold text-[#0A417A]"
									>Pihak Pertama</label
								>
								<input
									type="text"
									id="firstParty"
									name="firstParty"
									bind:value={up3FirstParty}
									placeholder="Nama Pihak Pertama (UP3)"
									required
									class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500"
								/>
							</div>
						</div>

						<!-- Rincian Material Dynamic -->
						<div class="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
							<div class="mb-3 flex items-center justify-between">
								<label class="block text-sm font-bold tracking-wider text-[#0A417A] uppercase"
									>Rincian Barang</label
								>
								<button
									type="button"
									onclick={addMaterialRow}
									class="rounded-md bg-[#0188CE] px-3 py-1 text-[10px] font-black text-white shadow-sm hover:bg-blue-600"
								>
									+ TAMBAH BARIS
								</button>
							</div>

							<div class="space-y-3">
								{#each materialRows as row, i}
									<div
										class="relative space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
									>
										<button
											type="button"
											onclick={() => removeMaterialRow(i)}
											class="absolute -top-2 -right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow transition-colors hover:bg-red-600"
										>
											<span class="text-[10px]">✕</span>
										</button>
										<div class="relative w-full">
											<input type="hidden" name="materialId[]" value={row.materialId} />
											<input
												type="text"
												placeholder="Pilih/Ketik Material..."
												bind:value={row.searchQuery}
												onfocus={() => {
													row.showDropdown = true;
												}}
												onblur={() => handleBlur(row, data.materials ?? [])}
												required
												class="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-cyan-500"
											/>
											{#if row.showDropdown}
												<div
													class="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-xl"
												>
													{#if getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []).length === 0}
														<div class="px-3 py-2 text-center text-gray-400 italic">
															Tidak ada material cocok
														</div>
													{:else}
														{#each getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []) as mat}
															<button
																type="button"
																onmousedown={(e) => {
																	e.preventDefault();
																	row.materialId = mat.id.toString();
																	row.searchQuery = mat.name;
																	row.showDropdown = false;
																}}
																class="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-[#0A417A] transition-colors hover:bg-cyan-50"
															>
																<span class="truncate pr-2">{mat.name} ({mat.unit})</span>
																<span
																	class="shrink-0 text-[10px] text-gray-400 {mat.stock <= 0
																		? 'font-bold text-red-500'
																		: ''}">STOK: {mat.stock}</span
																>
															</button>
														{/each}
													{/if}
												</div>
											{/if}
										</div>
										<div class="flex gap-2">
											<div class="relative w-20">
												<input
													type="number"
													name="jumlah[]"
													placeholder="Jml"
													bind:value={row.jumlah}
													required
													min="0"
													class="w-full rounded border border-gray-300 px-2 py-1.5 text-center text-xs outline-none {Number(
														row.jumlah
													) >
													((data.materials ?? []).find((m) => m.id.toString() === row.materialId)
														?.stock || 0)
														? 'border-red-500 bg-red-50 text-red-600'
														: ''}"
												/>
											</div>
											<input
												type="text"
												name="keterangan[]"
												placeholder="Keterangan (Kondisi/Ket)"
												class="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs outline-none"
											/>
										</div>
										{#if Number(row.jumlah) > ((data.materials ?? []).find((m) => m.id.toString() === row.materialId)?.stock || 0)}
											<p class="mt-1 text-[9px] font-bold text-red-500 italic">
												⚠️ Stok pusat tidak cukup ({(data.materials ?? []).find(
													(m) => m.id.toString() === row.materialId
												)?.stock || 0})
											</p>
										{/if}
									</div>
								{/each}
								{#if materialRows.length === 0}
									<div
										class="rounded-lg border border-dashed border-gray-200 bg-white py-6 text-center text-xs text-gray-400 italic"
									>
										Belum ada rincian barang. Klik "+ TAMBAH BARIS" untuk menambahkan.
									</div>
								{/if}
							</div>
						</div>

						<!-- Foto Dokumentasi (UP3) -->
						<div class="space-y-1.5 border-t border-gray-100 pt-4">
							<label class="block text-sm font-bold text-[#0A417A]">
								Foto Dokumentasi Serah Terima
								<span class="ml-1 text-red-500">*</span>
								<span class="ml-1 text-[10px] font-normal text-red-500">(Wajib diisi)</span>
							</label>
							<div class="flex items-center gap-4">
								<label
									class="cursor-pointer rounded-lg border bg-white px-4 py-2 font-bold text-gray-700 {fileBase64
										? 'border-green-400'
										: 'border-red-300'} inline-flex items-center text-xs shadow-sm transition-all hover:bg-gray-50"
								>
									<svg
										class="mr-2 h-4 w-4 {fileBase64 ? 'text-green-600' : 'text-red-400'}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
										></path></svg
									>
									Upload Foto
									<input
										type="file"
										accept="image/*"
										capture="environment"
										class="hidden"
										onchange={(e) => handleFileChange(e, 'PHOTO')}
									/>
								</label>
								{#if fileBase64}
									<span class="animate-pulse text-xs font-bold text-green-600 italic"
										>✓ Foto Dokumentasi Siap!</span
									>
								{:else}
									<span class="text-xs font-semibold text-red-500 italic"
										>⚠ Foto belum diupload</span
									>
								{/if}
								<input type="hidden" name="photoBase64" value={fileBase64} />
							</div>
						</div>

						<div class="mt-auto flex gap-4">
							{#if selectedRequestId}
								<button
									type="submit"
									formaction="?/tolakPermintaan"
									formnovalidate
									class="w-1/3 rounded-xl bg-red-500 py-4 text-sm font-black text-white shadow-lg hover:bg-red-600 disabled:opacity-50"
									disabled={isSubmitting}
								>
									TOLAK PERMINTAAN
								</button>
							{/if}
							<button
								type="submit"
								class="flex-1 rounded-xl bg-[#FFD500] py-4 text-lg font-black text-[#0A417A] shadow-lg hover:bg-[#FFAB00] disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale"
								disabled={isSubmitting || !fileBase64}
								title={!fileBase64 ? 'Upload foto dokumentasi serah terima terlebih dahulu' : ''}
							>
								{#if isSubmitting}
									<div class="flex items-center justify-center">
										<svg
											class="mr-3 h-6 w-6 animate-spin rounded-full border-4 border-[#0A417A] border-t-transparent"
											viewBox="0 0 24 24"
										></svg>
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
					<div class="flex flex-1 flex-col space-y-6">
						<h2
							class="mb-2 text-xl font-black font-bold tracking-tighter text-[#0A417A] uppercase italic"
						>
							Input Pemakaian Lapangan (UP3)
						</h2>

						<form method="POST" action="?/penggunaan" use:enhance={handleEnhance} class="space-y-6">
							<!-- Header Info -->
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label
										class="pl-1 text-[10px] font-black tracking-widest text-[#0A417A] uppercase"
										>Tanggal Pasang</label
									>
									<input
										type="date"
										name="tanggal"
										required
										class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-cyan-500"
									/>
								</div>
								<div class="space-y-1.5">
									<label
										class="pl-1 text-[10px] font-black tracking-widest text-[#0A417A] uppercase"
										>Nama Petugas</label
									>
									<input
										type="text"
										name="takerName"
										placeholder="Nama Teknisi/Petugas"
										required
										class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-cyan-500"
									/>
								</div>
							</div>

							<div class="space-y-1.5">
								<label class="pl-1 text-[10px] font-black tracking-widest text-[#0A417A] uppercase"
									>Tujuan / Nomor SPK</label
								>
								<input
									type="text"
									name="usagePurpose"
									placeholder="Contoh: Perbaikan Trafo Gardu / SPK-UP3-2026-001"
									required
									class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none focus:border-cyan-500"
								/>
							</div>

							<!-- Material List -->
							<div class="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-inner">
								<div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
									<span
										class="text-[10px] font-black tracking-widest text-gray-400 uppercase italic"
										>Rincian Material Terpasang</span
									>
									<button
										type="button"
										onclick={addMaterialRow}
										class="rounded-lg border border-yellow-500 bg-[#FFD500] px-3 py-1 text-[10px] font-black text-[#0A417A] shadow-sm transition-all hover:scale-105"
										>+ TAMBAH</button
									>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div
											class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg"
										>
											<div
												class="mb-3 flex items-start justify-between border-b border-gray-50 pb-2"
											>
												<span
													class="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#0A417A] uppercase"
													>Item #{i + 1}</span
												>
												{#if materialRows.length > 1}
													<button
														type="button"
														onclick={() => removeMaterialRow(i)}
														class="p-1 text-red-400 transition-colors hover:text-red-600"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															><path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															></path></svg
														>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label
														class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
														>Pilih Material</label
													>
													<div class="relative w-full">
														<input type="hidden" name="materialId[]" value={row.materialId} />
														<input
															type="text"
															placeholder="Pilih/Ketik Material..."
															bind:value={row.searchQuery}
															onfocus={() => {
																row.showDropdown = true;
															}}
															onblur={() => handleBlur(row, data.materials ?? [])}
															required
															class="w-full border-b-2 border-gray-100 bg-transparent py-1 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
														/>
														{#if row.showDropdown}
															<div
																class="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-xl"
															>
																{#if getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []).length === 0}
																	<div class="px-3 py-2 text-center text-gray-400 italic">
																		Tidak ada material cocok
																	</div>
																{:else}
																	{#each getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []) as mat}
																		<button
																			type="button"
																			onmousedown={(e) => {
																				e.preventDefault();
																				row.materialId = mat.id.toString();
																				row.searchQuery = mat.name;
																				row.showDropdown = false;
																			}}
																			class="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-[#0A417A] transition-colors hover:bg-cyan-50"
																		>
																			<span class="truncate pr-2">{mat.name} ({mat.unit})</span>
																			<span
																				class="shrink-0 text-[10px] text-gray-400 {mat.stock <= 0
																					? 'font-bold text-red-500'
																					: ''}">SISA: {mat.stock}</span
																			>
																		</button>
																	{/each}
																{/if}
															</div>
														{/if}
													</div>
												</div>

												<div class="flex items-start gap-4">
													<!-- Quantity -->
													<div class="w-24">
														<label
															class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
															>Jumlah</label
														>
														<div class="flex items-center gap-1">
															<input
																type="number"
																name="jumlah[]"
																placeholder="0"
																bind:value={row.jumlah}
																required
																min="1"
																class="w-full rounded border-b-2 border-gray-100 px-1 py-1 text-center text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500 {Number(
																	row.jumlah
																) >
																((data.materials ?? []).find(
																	(m) => m.id.toString() === row.materialId
																)?.stock || 0)
																	? 'border-red-200 bg-red-50 text-red-500'
																	: ''}"
															/>
															<span class="truncate text-[10px] font-bold text-gray-400"
																>{(data.materials ?? []).find(
																	(m) => m.id.toString() === row.materialId
																)?.unit || ''}</span
															>
														</div>
														{#if Number(row.jumlah) > ((data.materials ?? []).find((m) => m.id.toString() === row.materialId)?.stock || 0)}
															<span
																class="mt-1 block text-[8px] font-bold tracking-tighter text-red-500"
																>SISA: {(data.materials ?? []).find(
																	(m) => m.id.toString() === row.materialId
																)?.stock || 0}</span
															>
														{/if}
													</div>

													<!-- Keterangan -->
													<div class="flex-1">
														<label
															class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
															>Keterangan / Catatan Lapangan</label
														>
														<input
															type="text"
															name="keterangan[]"
															placeholder="Contoh: Kondisi fisik material baik..."
															class="w-full border-b-2 border-gray-100 py-1 text-sm font-medium text-gray-700 italic transition-colors outline-none focus:border-cyan-500"
														/>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Photo Upload Section -->
							<div
								class="flex flex-col items-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-6"
							>
								<p
									class="mb-4 text-center text-[10px] font-black tracking-widest text-blue-800 uppercase italic"
								>
									Lampirkan Foto Bukti Pemasangan (Bisa lebih dari 1 gambar. Opsional untuk Draf,
									Wajib untuk Konfirmasi)
								</p>
								<div class="flex w-full flex-col items-center gap-4">
									<label
										class="inline-flex cursor-pointer items-center rounded-xl border-2 border-blue-300 bg-white px-6 py-3 text-xs font-black text-blue-700 shadow-md transition-all hover:bg-blue-100"
									>
										<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
											></path></svg
										>
										AMBIL FOTO LAPANGAN
										<input
											type="file"
											accept="image/*"
											multiple
											capture="environment"
											class="hidden"
											onchange={(e) => handleFileChange(e, 'PEMAKAIAN')}
										/>
									</label>

									{#if pemakaianPhotos.length > 0}
										<div class="mt-2 flex w-full flex-wrap justify-center gap-3">
											{#each pemakaianPhotos as photo, i}
												<div class="relative inline-block">
													<img
														src={photo}
														alt="Preview"
														class="h-24 w-24 rounded-lg border-2 border-green-300 object-cover shadow-sm"
													/>
													<button
														type="button"
														onclick={() =>
															(pemakaianPhotos = pemakaianPhotos.filter((_, idx) => idx !== i))}
														class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-md hover:bg-red-600"
														>✕</button
													>
													<input type="hidden" name="photoBase64[]" value={photo} />
												</div>
											{/each}
										</div>
										<div class="mt-2 animate-bounce text-xs font-black text-green-600 italic">
											✓ {pemakaianPhotos.length} Foto Terlampir
										</div>
									{:else}
										<div class="mt-2 text-xs font-bold text-gray-400 italic">Belum ada foto</div>
									{/if}
								</div>
							</div>

							<!-- Two Action Buttons -->
							<div class="mt-8 grid grid-cols-2 gap-4">
								<button
									type="submit"
									name="targetStatus"
									value="DRAFT"
									class="rounded-xl border-2 border-gray-200 bg-gray-100 py-4 text-sm font-black text-gray-500 shadow-sm transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-50"
									disabled={isSubmitting}
								>
									{#if isSubmitting}
										MEMPROSES...
									{:else}
										SIMPAN DRAF
									{/if}
								</button>
								<button
									type="submit"
									name="targetStatus"
									value="COMPLETED"
									class="rounded-xl bg-green-500 py-4 text-sm font-black text-white shadow-lg shadow-green-200 transition-all hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:grayscale"
									disabled={isSubmitting}
								>
									{#if isSubmitting}
										MEMPROSES...
									{:else}
										KONFIRMASI PEMAKAIAN
									{/if}
								</button>
							</div>
							<p class="text-center text-[10px] font-medium text-gray-400 italic">
								*Foto bukti bersifat opsional.
							</p>
						</form>
					</div>
				{:else if up3ActiveTab === 'STOK_AWAL'}
					<div class="flex flex-1 flex-col space-y-6">
						<h2
							class="mb-2 text-xl font-black font-bold tracking-tighter text-[#0A417A] uppercase italic"
						>
							Input Stok Awal Pusat (UP3)
						</h2>

						<form
							method="POST"
							action="?/stokAwal"
							use:enhance={handleEnhance}
							class="flex flex-1 flex-col space-y-6"
						>
							<!-- Material List -->
							<div class="flex-1 rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-inner">
								<div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
									<span
										class="text-[10px] font-black tracking-widest text-gray-400 uppercase italic"
										>Rincian Material Stok Awal Pusat</span
									>
									<button
										type="button"
										onclick={addMaterialRow}
										class="rounded-lg border border-yellow-500 bg-[#FFD500] px-3 py-1 text-[10px] font-black text-[#0A417A] shadow-sm transition-all hover:scale-105"
										>+ TAMBAH</button
									>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
											<div
												class="mb-3 flex items-start justify-between border-b border-gray-50 pb-2"
											>
												<span
													class="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#0A417A] uppercase"
													>Item #{i + 1}</span
												>
												{#if materialRows.length > 1}
													<button
														type="button"
														onclick={() => removeMaterialRow(i)}
														class="p-1 text-red-400 transition-colors hover:text-red-600"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															><path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															></path></svg
														>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label
														class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
														>Pilih Material</label
													>
													<div class="relative w-full">
														<input type="hidden" name="materialId[]" value={row.materialId} />
														<input
															type="text"
															placeholder="Pilih/Ketik Material..."
															bind:value={row.searchQuery}
															onfocus={() => {
																row.showDropdown = true;
															}}
															onblur={() =>
																handleBlur(
																	row,
																	data.materials.filter((m) => !m.hasStockRecord)
																)}
															required
															class="w-full border-b-2 border-gray-100 bg-transparent py-1 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
														/>
														{#if row.showDropdown}
															<div
																class="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-xl"
															>
																{#if getFilteredMaterials( row.searchQuery, row.materialId, data.materials.filter((m) => !m.hasStockRecord) ).length === 0}
																	<div class="px-3 py-2 text-center text-gray-400 italic">
																		Tidak ada material cocok
																	</div>
																{:else}
																	{#each getFilteredMaterials( row.searchQuery, row.materialId, data.materials.filter((m) => !m.hasStockRecord) ) as mat}
																		<button
																			type="button"
																			onmousedown={(e) => {
																				e.preventDefault();
																				row.materialId = mat.id.toString();
																				row.searchQuery = mat.name;
																				row.showDropdown = false;
																			}}
																			class="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-[#0A417A] transition-colors hover:bg-cyan-50"
																		>
																			<span class="truncate pr-2">{mat.name} ({mat.unit})</span>
																		</button>
																	{/each}
																{/if}
															</div>
														{/if}
													</div>
												</div>

												<div class="flex items-start gap-4">
													<!-- Quantity -->
													<div class="w-full">
														<label
															class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
															>Jumlah Fisik Saat Ini</label
														>
														<div class="flex items-center gap-2">
															<input
																type="number"
																name="jumlah[]"
																placeholder="0"
																bind:value={row.jumlah}
																required
																min="0"
																class="flex-1 rounded border-b-2 border-gray-100 px-2 py-1 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
															/>
															<span class="w-16 truncate text-[10px] font-bold text-gray-400"
																>{data.materials.find((m) => m.id.toString() === row.materialId)
																	?.unit || ''}</span
															>
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
								class="mt-auto w-full rounded-xl bg-[#0188CE] py-4 text-lg font-black text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
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
					{@const pendingStocks = (data.requestedTransactions || []).filter(
						(t) => t.type === 'INITIAL_STOCK'
					)}
					{@const groupedStocks = pendingStocks.reduce(
						(acc, trx) => {
							if (!acc[trx.ulpName]) acc[trx.ulpName] = [];
							acc[trx.ulpName].push(trx);
							return acc;
						},
						{} as Record<string, typeof pendingStocks>
					)}
					<div class="flex flex-1 flex-col space-y-6">
						<h2
							class="mb-2 text-xl font-black font-bold tracking-tighter text-[#0A417A] uppercase italic"
						>
							Persetujuan Stok Awal ULP
						</h2>

						{#if pendingStocks && pendingStocks.length > 0}
							<div class="custom-scroll max-h-[550px] flex-1 space-y-6 overflow-y-auto pr-2">
								{#each Object.entries(groupedStocks) as [ulpName, trxList]}
									{@const trxItems = trxList as Array<{
										id: number;
										referenceNumber: string;
										date: string;
										items: Array<{ name: string; quantity: number }>;
									}>}
									<div
										class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
									>
										<!-- Group Header -->
										<div
											class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3"
										>
											<div class="flex items-center gap-3">
												<div class="rounded-lg border border-gray-100 bg-white p-1.5 shadow-sm">
													<svg
														class="h-5 w-5 text-[#0188CE]"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
														><path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
														></path></svg
													>
												</div>
												<h3 class="text-sm font-black tracking-widest text-[#0A417A] uppercase">
													{ulpName}
												</h3>
											</div>
											<span
												class="rounded-full bg-[#0A417A] px-3 py-1 text-[10px] font-black text-white shadow-sm"
												>{trxItems.length} Pengajuan</span
											>
										</div>

										<!-- Group Content (Requests) -->
										<div class="space-y-5 bg-gray-50/30 p-5">
											{#each trxItems as trx}
												<div
													class="relative rounded-xl border border-yellow-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
												>
													<div
														class="mb-3 flex items-center justify-between border-b border-gray-50 pb-2"
													>
														<div>
															<p class="text-[10px] font-black text-gray-400 italic">
																No. Referensi: <span class="text-gray-600"
																	>{trx.referenceNumber}</span
																>
															</p>
															<p class="text-[10px] font-bold text-gray-400 italic">
																Tanggal: {new Date(trx.date).toLocaleDateString('id-ID')}
															</p>
														</div>
														<span
															class="rounded bg-yellow-400 px-2 py-1 text-[8px] font-black text-[#0A417A] shadow-sm"
															>BUTUH PERSETUJUAN</span
														>
													</div>

													<form
														method="POST"
														action="?/prosesStokAwal"
														use:enhance={handleEnhance}
														class="space-y-4"
													>
														<input type="hidden" name="transactionId" value={trx.id} />

														<div
															class="mb-5 space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-inner"
														>
															<p class="mb-3 text-[9px] font-black text-gray-400 uppercase">
																Rincian Material yang Diajukan (Pilih yang diterima):
															</p>
															{#each trx.items as item}
																<label
																	class="mb-2 flex cursor-pointer items-center justify-between rounded border-b border-gray-200 bg-white px-2 py-1.5 pb-2 text-xs font-bold text-gray-700 shadow-sm transition-colors last:mb-0 last:border-0 last:pb-0 hover:bg-gray-200"
																>
																	<div class="flex items-center gap-3">
																		<input
																			type="checkbox"
																			name="acceptedMaterials[]"
																			value={item.materialId}
																			class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
																			checked
																		/>
																		<span class="uppercase">{item.name}</span>
																	</div>
																	<span
																		class="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[#0A417A]"
																		>{item.quantity} Unit</span
																	>
																</label>
															{/each}
														</div>

														<div class="flex gap-3">
															<button
																type="submit"
																name="actionType"
																value="REJECT"
																class="flex-1 rounded-xl bg-red-500 py-2.5 text-[11px] font-black text-white shadow-sm transition-all hover:bg-red-600 disabled:opacity-50"
																disabled={isSubmitting}
															>
																{#if isSubmitting}
																	MEMPROSES...
																{:else}
																	TOLAK SEMUA
																{/if}
															</button>
															<button
																type="submit"
																name="actionType"
																value="ACCEPT"
																class="flex-1 rounded-xl bg-green-500 py-2.5 text-[11px] font-black text-white shadow-sm transition-all hover:bg-green-600 disabled:opacity-50"
																disabled={isSubmitting}
															>
																{#if isSubmitting}
																	MEMPROSES...
																{:else}
																	TERIMA PILIHAN
																{/if}
															</button>
														</div>
													</form>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8"
							>
								<svg
									class="mb-4 h-16 w-16 text-gray-300"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									></path></svg
								>
								<p class="text-sm font-bold text-gray-400">
									Tidak ada pengajuan stok awal dari ULP yang menunggu persetujuan.
								</p>
							</div>
						{/if}
					</div>
				{/if}
			{:else}
				<!-- TABS BAGI ULP -->
				<div class="mb-6 flex rounded-t-lg border-b border-gray-200 bg-gray-50 p-1">
					<button
						class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {ulpActiveTab ===
						'PERMINTAAN'
							? 'rounded-md bg-white text-[#0A417A] shadow-sm'
							: 'text-gray-400 hover:text-gray-600'}"
						onclick={() => {
							ulpActiveTab = 'PERMINTAAN';
							materialRows = [
								{ materialId: '', jumlah: '', keterangan: '', searchQuery: '', showDropdown: false }
							];
						}}
					>
						PERMINTAAN
					</button>
					<button
						class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {ulpActiveTab ===
						'PEMAKAIAN'
							? 'rounded-md bg-white text-[#0A417A] shadow-sm'
							: 'text-gray-400 hover:text-gray-600'}"
						onclick={() => {
							ulpActiveTab = 'PEMAKAIAN';
							materialRows = [
								{ materialId: '', jumlah: '', keterangan: '', searchQuery: '', showDropdown: false }
							];
						}}
					>
						PEMAKAIAN
					</button>
					{#if (data.materials ?? []).filter((m) => !m.hasStockRecord).length > 0 || ulpActiveTab === 'STOK_AWAL'}
						<button
							class="flex-1 px-2 py-2 text-[10px] font-black tracking-widest {ulpActiveTab ===
							'STOK_AWAL'
								? 'rounded-md bg-white text-[#0A417A] shadow-sm'
								: 'text-gray-400 hover:text-gray-600'}"
							onclick={() => {
								ulpActiveTab = 'STOK_AWAL';
								materialRows = [
									{
										materialId: '',
										jumlah: '',
										keterangan: '',
										searchQuery: '',
										showDropdown: false
									}
								];
							}}
						>
							STOK AWAL
						</button>
					{/if}
				</div>

				{#if ulpActiveTab === 'PERMINTAAN'}
					<h2 class="mb-8 text-xl font-bold text-[#0A417A]">Pengajuan Permintaan Material</h2>
					<form
						method="POST"
						action="?/minta"
						use:enhance={handleEnhance}
						class="flex flex-1 flex-col space-y-6"
					>
						<!-- Input Petugas -->
						<div class="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-inner">
							<label
								class="mb-1 block text-[10px] font-black tracking-widest text-gray-400 uppercase"
								>Nama Petugas Pengambil / Penanggung Jawab</label
							>
							<input
								type="text"
								name="takerName"
								placeholder="Contoh: Budi (Akan ke Gudang UP3)"
								required
								class="w-full border-b-2 border-gray-200 bg-transparent py-2 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
							/>
						</div>

						<!-- Material List -->
						<div class="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-inner">
							<div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
								<span class="text-[10px] font-black tracking-widest text-gray-400 uppercase italic"
									>Rincian Material yang Diajukan</span
								>
								<button
									type="button"
									onclick={addMaterialRow}
									class="rounded-lg border border-yellow-500 bg-[#FFD500] px-3 py-1 text-[10px] font-black text-[#0A417A] shadow-sm transition-all hover:scale-105"
									>+ TAMBAH</button
								>
							</div>
							<div class="space-y-3">
								{#each materialRows as row, i}
									<div
										class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg"
									>
										<div class="mb-3 flex items-start justify-between border-b border-gray-50 pb-2">
											<span
												class="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#0A417A] uppercase"
												>Item #{i + 1}</span
											>
											{#if materialRows.length > 1}
												<button
													type="button"
													onclick={() => removeMaterialRow(i)}
													class="p-1 text-red-400 transition-colors hover:text-red-600"
												>
													<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
														><path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														></path></svg
													>
												</button>
											{/if}
										</div>

										<div class="space-y-4">
											<!-- Material Select -->
											<div>
												<label
													class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
													>Pilih Material</label
												>
												<div class="relative w-full">
													<input type="hidden" name="materialId[]" value={row.materialId} />
													<input
														type="text"
														placeholder="Pilih/Ketik Material..."
														bind:value={row.searchQuery}
														onfocus={() => {
															row.showDropdown = true;
														}}
														onblur={() => handleBlur(row, data.materials ?? [])}
														required
														class="w-full border-b-2 border-gray-100 bg-transparent py-1 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
													/>
													{#if row.showDropdown}
														<div
															class="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-xl"
														>
															{#if getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []).length === 0}
																<div class="px-3 py-2 text-center text-gray-400 italic">
																	Tidak ada material cocok
																</div>
															{:else}
																{#each getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []) as mat}
																	<button
																		type="button"
																		onmousedown={(e) => {
																			e.preventDefault();
																			row.materialId = mat.id.toString();
																			row.searchQuery = mat.name;
																			row.showDropdown = false;
																		}}
																		class="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-[#0A417A] transition-colors hover:bg-cyan-50"
																	>
																		<span class="truncate pr-2">{mat.name}</span>
																		<span class="shrink-0 text-[10px] text-gray-400"
																			>{mat.up3Stock} {mat.unit.toLowerCase()}</span
																		>
																	</button>
																{/each}
															{/if}
														</div>
													{/if}
												</div>
											</div>

											<div class="flex items-start gap-4">
												<!-- Quantity -->
												<div class="w-24">
													<label
														class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
														>Jumlah</label
													>
													<div class="flex items-center gap-1">
														<input
															type="number"
															name="jumlah[]"
															placeholder="0"
															bind:value={row.jumlah}
															required
															min="1"
															class="w-full rounded border-b-2 border-gray-100 px-1 py-1 text-center text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
														/>
														<span class="truncate text-[10px] font-bold text-gray-400"
															>{(data.materials ?? []).find(
																(m) => m.id.toString() === row.materialId
															)?.unit || ''}</span
														>
													</div>
												</div>

												<!-- Keterangan -->
												<div class="flex-1">
													<label
														class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
														>Keterangan (Opsional)</label
													>
													<input
														type="text"
														name="keterangan[]"
														placeholder="Alasan permintaan..."
														class="w-full border-b-2 border-gray-100 py-1 text-sm font-medium text-gray-700 italic transition-colors outline-none focus:border-cyan-500"
													/>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Photo Upload Section -->
						<div
							class="mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-cyan-300 bg-cyan-50 p-6"
						>
							<p
								class="mb-4 text-center text-[10px] font-black tracking-widest text-cyan-800 uppercase italic"
							>
								Lampirkan Surat Permintaan (Opsional)
							</p>
							<div class="flex items-center gap-6">
								<label
									class="inline-flex cursor-pointer items-center rounded-xl border-2 border-cyan-300 bg-white px-6 py-3 text-xs font-black text-cyan-700 shadow-md transition-all hover:bg-cyan-100"
								>
									<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12"
										></path></svg
									>
									PILIH FILE SURAT
									<input
										type="file"
										accept="image/*,application/pdf"
										class="hidden"
										onchange={(e) => handleFileChange(e, 'LETTER')}
									/>
								</label>
								{#if requestLetterBase64}
									<div
										class="flex animate-bounce items-center text-xs font-black text-green-600 italic"
									>
										<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											></path></svg
										>
										Surat Terlampir
									</div>
								{:else}
									<div class="text-xs font-bold text-gray-400 italic">Belum ada file</div>
								{/if}
								<input type="hidden" name="letterBase64" value={requestLetterBase64} />
							</div>
						</div>

						<button
							type="submit"
							class="mt-auto w-full rounded-xl bg-[#0188CE] py-4 text-lg font-black text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
							disabled={isSubmitting}
						>
							{#if isSubmitting}
								MEMPROSES...
							{:else}
								AJUKAN PERMINTAAN
							{/if}
						</button>
					</form>
				{:else if ulpActiveTab === 'PEMAKAIAN'}
					<div class="flex flex-1 flex-col space-y-6">
						<h2
							class="mb-2 text-xl font-black font-bold tracking-tighter text-[#0A417A] uppercase italic"
						>
							Input Pemakaian Lapangan
						</h2>

						<form
							method="POST"
							action="?/penggunaan"
							use:enhance={handleEnhance}
							onsubmit={(e) => {
								const submitter = e.submitter as HTMLButtonElement | null;
								if (submitter && submitter.value === 'COMPLETED' && pemakaianPhotos.length === 0) {
									e.preventDefault();
									alert(
										'Foto bukti (eviden) wajib diunggah minimal 1 gambar untuk konfirmasi pemakaian!'
									);
								}
							}}
							class="space-y-6"
						>
							<!-- Header Info -->
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label
										class="pl-1 text-[10px] font-black tracking-widest text-[#0A417A] uppercase"
										>Tanggal Pasang</label
									>
									<input
										type="date"
										name="tanggal"
										required
										class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-cyan-500"
									/>
								</div>
								<div class="space-y-1.5">
									<label
										class="pl-1 text-[10px] font-black tracking-widest text-[#0A417A] uppercase"
										>Nama Petugas</label
									>
									<input
										type="text"
										name="takerName"
										placeholder="Nama Teknisi"
										required
										class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-cyan-500"
									/>
								</div>
							</div>

							<div class="space-y-1.5">
								<label class="pl-1 text-[10px] font-black tracking-widest text-[#0A417A] uppercase"
									>Tujuan / Nomor SPK</label
								>
								<input
									type="text"
									name="usagePurpose"
									placeholder="Contoh: Perbaikan Gardu GT-01 / SPK-2023-001"
									required
									class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none focus:border-cyan-500"
								/>
							</div>

							<!-- Material List -->
							<div class="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-inner">
								<div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
									<span
										class="text-[10px] font-black tracking-widest text-gray-400 uppercase italic"
										>Rincian Material Terpasang</span
									>
									<button
										type="button"
										onclick={addMaterialRow}
										class="rounded-lg border border-yellow-500 bg-[#FFD500] px-3 py-1 text-[10px] font-black text-[#0A417A] shadow-sm transition-all hover:scale-105"
										>+ TAMBAH</button
									>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div
											class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg"
										>
											<div
												class="mb-3 flex items-start justify-between border-b border-gray-50 pb-2"
											>
												<span
													class="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#0A417A] uppercase"
													>Item #{i + 1}</span
												>
												{#if materialRows.length > 1}
													<button
														type="button"
														onclick={() => removeMaterialRow(i)}
														class="p-1 text-red-400 transition-colors hover:text-red-600"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															><path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															></path></svg
														>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label
														class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
														>Pilih Material</label
													>
													<div class="relative w-full">
														<input type="hidden" name="materialId[]" value={row.materialId} />
														<input
															type="text"
															placeholder="Pilih/Ketik Material..."
															bind:value={row.searchQuery}
															onfocus={() => {
																row.showDropdown = true;
															}}
															onblur={() => handleBlur(row, data.materials ?? [])}
															required
															class="w-full border-b-2 border-gray-100 bg-transparent py-1 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
														/>
														{#if row.showDropdown}
															<div
																class="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-xl"
															>
																{#if getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []).length === 0}
																	<div class="px-3 py-2 text-center text-gray-400 italic">
																		Tidak ada material cocok
																	</div>
																{:else}
																	{#each getFilteredMaterials(row.searchQuery, row.materialId, data.materials ?? []) as mat}
																		<button
																			type="button"
																			onmousedown={(e) => {
																				e.preventDefault();
																				row.materialId = mat.id.toString();
																				row.searchQuery = mat.name;
																				row.showDropdown = false;
																			}}
																			class="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-[#0A417A] transition-colors hover:bg-cyan-50"
																		>
																			<span class="truncate pr-2">{mat.name} ({mat.unit})</span>
																			<span
																				class="shrink-0 text-[10px] text-gray-400 {mat.stock <= 0
																					? 'font-bold text-red-500'
																					: ''}">SISA: {mat.stock}</span
																			>
																		</button>
																	{/each}
																{/if}
															</div>
														{/if}
													</div>
												</div>

												<div class="flex items-start gap-4">
													<!-- Quantity -->
													<div class="w-24">
														<label
															class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
															>Jumlah</label
														>
														<div class="flex items-center gap-1">
															<input
																type="number"
																name="jumlah[]"
																placeholder="0"
																bind:value={row.jumlah}
																required
																min="1"
																class="w-full rounded border-b-2 border-gray-100 px-1 py-1 text-center text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500 {Number(
																	row.jumlah
																) >
																((data.materials ?? []).find(
																	(m) => m.id.toString() === row.materialId
																)?.stock || 0)
																	? 'border-red-200 bg-red-50 text-red-500'
																	: ''}"
															/>
															<span class="truncate text-[10px] font-bold text-gray-400"
																>{(data.materials ?? []).find(
																	(m) => m.id.toString() === row.materialId
																)?.unit || ''}</span
															>
														</div>
														{#if Number(row.jumlah) > ((data.materials ?? []).find((m) => m.id.toString() === row.materialId)?.stock || 0)}
															<span
																class="mt-1 block text-[8px] font-bold tracking-tighter text-red-500"
																>SISA: {(data.materials ?? []).find(
																	(m) => m.id.toString() === row.materialId
																)?.stock || 0}</span
															>
														{/if}
													</div>

													<!-- Keterangan -->
													<div class="flex-1">
														<label
															class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
															>Keterangan / Catatan Lapangan</label
														>
														<input
															type="text"
															name="keterangan[]"
															placeholder="Contoh: Kondisi fisik material baik..."
															class="w-full border-b-2 border-gray-100 py-1 text-sm font-medium text-gray-700 italic transition-colors outline-none focus:border-cyan-500"
														/>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Photo Upload Section -->
							<div
								class="flex flex-col items-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-6"
							>
								<p
									class="mb-4 text-center text-[10px] font-black tracking-widest text-blue-800 uppercase italic"
								>
									Lampirkan Foto Bukti Pemasangan (Bisa lebih dari 1 gambar. Opsional untuk Draf,
									Wajib untuk Konfirmasi)
								</p>
								<div class="flex w-full flex-col items-center gap-4">
									<label
										class="inline-flex cursor-pointer items-center rounded-xl border-2 border-blue-300 bg-white px-6 py-3 text-xs font-black text-blue-700 shadow-md transition-all hover:bg-blue-100"
									>
										<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
											></path></svg
										>
										AMBIL FOTO LAPANGAN
										<input
											type="file"
											accept="image/*"
											multiple
											capture="environment"
											class="hidden"
											onchange={(e) => handleFileChange(e, 'PEMAKAIAN')}
										/>
									</label>

									{#if pemakaianPhotos.length > 0}
										<div class="mt-2 flex w-full flex-wrap justify-center gap-3">
											{#each pemakaianPhotos as photo, i}
												<div class="relative inline-block">
													<img
														src={photo}
														alt="Preview"
														class="h-24 w-24 rounded-lg border-2 border-green-300 object-cover shadow-sm"
													/>
													<button
														type="button"
														onclick={() =>
															(pemakaianPhotos = pemakaianPhotos.filter((_, idx) => idx !== i))}
														class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-md hover:bg-red-600"
														>✕</button
													>
													<input type="hidden" name="photoBase64[]" value={photo} />
												</div>
											{/each}
										</div>
										<div class="mt-2 animate-bounce text-xs font-black text-green-600 italic">
											✓ {pemakaianPhotos.length} Foto Terlampir
										</div>
									{:else}
										<div class="mt-2 text-xs font-bold text-gray-400 italic">Belum ada foto</div>
									{/if}
								</div>
							</div>

							<!-- Two Action Buttons -->
							<div class="mt-8 grid grid-cols-2 gap-4">
								<button
									type="submit"
									name="targetStatus"
									value="DRAFT"
									class="rounded-xl border-2 border-gray-200 bg-gray-100 py-4 text-sm font-black text-gray-500 shadow-sm transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-50"
									disabled={isSubmitting}
								>
									{#if isSubmitting}
										MEMPROSES...
									{:else}
										SIMPAN DRAF
									{/if}
								</button>
								<button
									type="submit"
									name="targetStatus"
									value="COMPLETED"
									class="rounded-xl bg-green-500 py-4 text-sm font-black text-white shadow-lg shadow-green-200 transition-all hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:grayscale"
									disabled={isSubmitting}
								>
									{#if isSubmitting}
										MEMPROSES...
									{:else}
										KONFIRMASI PEMAKAIAN
									{/if}
								</button>
							</div>
							<p class="text-center text-[10px] font-bold text-red-500 italic">
								*Foto bukti (eviden) wajib diunggah untuk konfirmasi pemakaian, opsional untuk draf.
							</p>
						</form>
					</div>
				{:else if ulpActiveTab === 'STOK_AWAL'}
					<div class="flex flex-1 flex-col space-y-6">
						<h2
							class="mb-2 text-xl font-black font-bold tracking-tighter text-[#0A417A] uppercase italic"
						>
							Input Stok Awal ULP
						</h2>

						<form
							method="POST"
							action="?/stokAwal"
							use:enhance={handleEnhance}
							class="flex flex-1 flex-col space-y-6"
						>
							<!-- Material List -->
							<div class="flex-1 rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-inner">
								<div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
									<span
										class="text-[10px] font-black tracking-widest text-gray-400 uppercase italic"
										>Rincian Material Stok Awal</span
									>
									<button
										type="button"
										onclick={addMaterialRow}
										class="rounded-lg border border-yellow-500 bg-[#FFD500] px-3 py-1 text-[10px] font-black text-[#0A417A] shadow-sm transition-all hover:scale-105"
										>+ TAMBAH</button
									>
								</div>
								<div class="space-y-3">
									{#each materialRows as row, i}
										<div class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
											<div
												class="mb-3 flex items-start justify-between border-b border-gray-50 pb-2"
											>
												<span
													class="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#0A417A] uppercase"
													>Item #{i + 1}</span
												>
												{#if materialRows.length > 1}
													<button
														type="button"
														onclick={() => removeMaterialRow(i)}
														class="p-1 text-red-400 transition-colors hover:text-red-600"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															><path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															></path></svg
														>
													</button>
												{/if}
											</div>

											<div class="space-y-4">
												<!-- Material Select -->
												<div>
													<label
														class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
														>Pilih Material</label
													>
													<div class="relative w-full">
														<input type="hidden" name="materialId[]" value={row.materialId} />
														<input
															type="text"
															placeholder="Pilih/Ketik Material..."
															bind:value={row.searchQuery}
															onfocus={() => {
																row.showDropdown = true;
															}}
															onblur={() =>
																handleBlur(
																	row,
																	(data.materials ?? []).filter((m) => !m.hasStockRecord)
																)}
															required
															class="w-full border-b-2 border-gray-100 bg-transparent py-1 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
														/>
														{#if row.showDropdown}
															<div
																class="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-xl"
															>
																{#if getFilteredMaterials( row.searchQuery, row.materialId, (data.materials ?? []).filter((m) => !m.hasStockRecord) ).length === 0}
																	<div class="px-3 py-2 text-center text-gray-400 italic">
																		Tidak ada material cocok
																	</div>
																{:else}
																	{#each getFilteredMaterials( row.searchQuery, row.materialId, (data.materials ?? []).filter((m) => !m.hasStockRecord) ) as mat}
																		<button
																			type="button"
																			onmousedown={(e) => {
																				e.preventDefault();
																				row.materialId = mat.id.toString();
																				row.searchQuery = mat.name;
																				row.showDropdown = false;
																			}}
																			class="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-[#0A417A] transition-colors hover:bg-cyan-50"
																		>
																			<span class="truncate pr-2">{mat.name} ({mat.unit})</span>
																		</button>
																	{/each}
																{/if}
															</div>
														{/if}
													</div>
												</div>

												<div class="flex items-start gap-4">
													<!-- Quantity -->
													<div class="w-full">
														<label
															class="mb-1 block text-[9px] font-bold tracking-widest text-gray-400 uppercase"
															>Jumlah Fisik Saat Ini</label
														>
														<div class="flex items-center gap-2">
															<input
																type="number"
																name="jumlah[]"
																placeholder="0"
																bind:value={row.jumlah}
																required
																min="0"
																class="flex-1 rounded border-b-2 border-gray-100 px-2 py-1 text-sm font-black text-[#0A417A] transition-colors outline-none focus:border-cyan-500"
															/>
															<span class="w-16 truncate text-[10px] font-bold text-gray-400"
																>{(data.materials ?? []).find(
																	(m) => m.id.toString() === row.materialId
																)?.unit || ''}</span
															>
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
								class="mt-auto w-full rounded-xl bg-[#0188CE] py-4 text-lg font-black text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
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
