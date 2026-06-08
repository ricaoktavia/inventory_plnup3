<script lang="ts">
	import { enhance } from '$app/forms';
	import { loadingState } from '$lib/loadingState.svelte';
	let { data, form } = $props();

	// Filters
	let searchQuery = $state('');
	let selectedUlpFilter = $state('ALL');
	let typeFilter = $state('ALL'); // ALL | DISTRIBUTION | USAGE | INITIAL_STOCK

	let filteredHistory = $derived(
		(data.usageHistory || []).filter((item: any) => {
			const matchesSearch = item.ulpName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.takerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(item.items || []).some((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
			
			const matchesUlp = selectedUlpFilter === 'ALL' || item.ulpName === selectedUlpFilter;
			
			let matchesType = false;
			if (typeFilter === 'ALL') {
				matchesType = true;
			} else if (typeFilter === 'USAGE_UP3') {
				matchesType = item.type === 'USAGE' && (!item.targetUlpId || item.ulpName === 'Pusat UP3');
			} else if (typeFilter === 'USAGE_ULP') {
				matchesType = item.type === 'USAGE' && item.targetUlpId && item.ulpName !== 'Pusat UP3';
			} else {
				matchesType = item.type === typeFilter;
			}
			
			return matchesSearch && matchesUlp && matchesType;
		})
	);

	// Lightbox Viewer Modal State
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

	// Finalization State
	let finalizingId = $state<number | null>(null);
	let photoBase64s = $state<string[]>([]);
	let isSubmitting = $state(false);

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
					let width = img.width;
					let height = img.height;
					const maxSize = 1600;
					if (width > height) {
						if (width > maxSize) { height *= maxSize / width; width = maxSize; }
					} else {
						if (height > maxSize) { width *= maxSize / height; height = maxSize; }
					}
					canvas.width = width;
					canvas.height = height;
					ctx.drawImage(img, 0, 0, width, height);
					resolve(canvas.toDataURL('image/jpeg', 0.7));
				};
			};
		});
	}

	async function handlePhotoUpload(e: Event) {
		const files = (e.target as HTMLInputElement).files;
		if (files && files.length > 0) {
			for (let i = 0; i < files.length; i++) {
				const compressed = await compressImage(files[i]);
				photoBase64s = [...photoBase64s, compressed];
			}
		}
	}

	function handleEnhance() {
		isSubmitting = true;
		loadingState.start('Memproses Data...', 3000);
		const startTime = Date.now();
		return async ({ result, update }: { result: any, update: any }) => {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, 2000 - elapsed);
			if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
			isSubmitting = false;
			loadingState.stop();
			if (result.type === 'success') {
				finalizingId = null;
				photoBase64s = [];
			}
			await update();
		};
	}
</script>

<svelte:head>
	<title>Usage Tracker - Monitoring & Histori</title>
</svelte:head>

<!-- Notifications -->
{#if form?.success}
	<div class="fixed top-20 right-10 z-[100] bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce">
		✅ {form.message}
	</div>
{/if}
{#if form?.error}
	<div class="fixed top-20 right-10 z-[100] bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-pulse">
		⚠️ {form.error}
	</div>
{/if}

<!-- Header -->
<div class="mb-8 flex flex-col gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-[1200px] mx-auto">
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div>
			<h1 class="text-xl font-bold text-[#0A417A] tracking-tight">Usage & Mutation Tracker</h1>
			<p class="text-gray-500 mt-1.5 flex items-center gap-2">
				<span class="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
				Monitoring real-time transaksi, mutasi, & pemakaian lapangan {data.userRole === 'ADMIN_UP3' ? 'semua unit ULP' : 'unit anda'}
			</p>
		</div>
		{#if data.userRole === 'ADMIN_ULP'}
			<a href="/mutasi?tab=PEMAKAIAN" class="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white font-black text-sm py-3 px-6 rounded-xl shadow-lg shadow-cyan-100 transition-all flex items-center justify-center gap-2 group transform active:scale-95">
				<svg class="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
				TAMBAH PEMAKAIAN
			</a>
		{/if}
	</div>

	<!-- Search Box -->
	<div class="mb-4">
		<label class="text-[10px] text-gray-400 mb-1.5 font-black uppercase tracking-widest pl-1 block">Cari Data:</label>
		<div class="relative">
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
			</div>
			<input 
				type="text" 
				bind:value={searchQuery}
				placeholder="Cari SPK, Petugas, Material..." 
				class="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm transition-all font-medium"
			/>
		</div>
	</div>

	<!-- Blue Gradient Filter Bar (One Row for Unit ULP and Tipe Transaksi) -->
	<div class="bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4] p-4 rounded-xl shadow-md text-white flex flex-col md:flex-row gap-4 items-end mb-2">
		<!-- Type Filter Tabs -->
		<div class="flex-1 w-full">
			<label class="text-[10px] text-white/90 mb-1.5 font-black uppercase tracking-widest pl-1 block">Tipe Transaksi:</label>
			<div class="flex bg-white/10 p-0.5 rounded-xl border border-white/20">
				<button class="flex-1 py-2 text-[8.5px] font-black rounded-lg transition-all {typeFilter === 'ALL' ? 'bg-white text-[#0A417A] shadow-sm' : 'text-white hover:bg-white/10'}" onclick={() => typeFilter = 'ALL'}>
					SEMUA
				</button>
				<button class="flex-1 py-2 text-[8.5px] font-black rounded-lg transition-all {typeFilter === 'DISTRIBUTION' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}" onclick={() => typeFilter = 'DISTRIBUTION'}>
					TRANSFER MATERIAL
				</button>
				{#if data.userRole === 'ADMIN_UP3'}
					<button class="flex-1 py-2 text-[8.5px] font-black rounded-lg transition-all {typeFilter === 'USAGE_UP3' ? 'bg-white text-orange-600 shadow-sm' : 'text-white hover:bg-white/10'}" onclick={() => typeFilter = 'USAGE_UP3'}>
						PEMAKAIAN UP3
					</button>
					<button class="flex-1 py-2 text-[8.5px] font-black rounded-lg transition-all {typeFilter === 'USAGE_ULP' ? 'bg-white text-orange-600 shadow-sm' : 'text-white hover:bg-white/10'}" onclick={() => typeFilter = 'USAGE_ULP'}>
						PEMAKAIAN ULP
					</button>
				{:else}
					<button class="flex-1 py-2 text-[8.5px] font-black rounded-lg transition-all {typeFilter === 'USAGE' ? 'bg-white text-orange-600 shadow-sm' : 'text-white hover:bg-white/10'}" onclick={() => typeFilter = 'USAGE'}>
						PEMAKAIAN
					</button>
				{/if}
				<button class="flex-1 py-2 text-[8.5px] font-black rounded-lg transition-all {typeFilter === 'INITIAL_STOCK' ? 'bg-white text-purple-600 shadow-sm' : 'text-white hover:bg-white/10'}" onclick={() => typeFilter = 'INITIAL_STOCK'}>
					STOK AWAL
				</button>
			</div>
		</div>

		<!-- ULP Filter -->
		{#if data.userRole === 'ADMIN_UP3'}
			<div class="flex-1 w-full">
				<label for="ulpFilter" class="text-[10px] text-white/90 mb-1.5 font-black uppercase tracking-widest pl-1 block">Unit ULP:</label>
				<select 
					id="ulpFilter"
					bind:value={selectedUlpFilter}
					class="w-full border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-cyan-300 outline-none bg-white/20 text-white cursor-pointer hover:bg-white/30 transition-all shadow-inner font-bold"
				>
					<option value="ALL" class="text-gray-800">Semua ULP</option>
					<option value="Pusat UP3" class="text-gray-800">Pusat UP3</option>
					{#each data.ulps as ulp}
						<option value={ulp.name} class="text-gray-800">{ulp.name}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>
</div>

<!-- History Cards Layout -->
<div class="max-w-[1200px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
	{#if filteredHistory.length === 0}
		<div class="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 font-bold italic shadow-sm uppercase tracking-wider">
			Belum ada data riwayat transaksi yang cocok.
		</div>
	{:else}
		{#each filteredHistory as trx}
			<div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative transition-all hover:shadow-md flex flex-col justify-between {trx.status === 'COMPLETED' ? '' : 'bg-gray-50/50 border-dashed'}">
				<div>
					<!-- Floating Status Badge -->
					<div class="absolute top-6 right-6 flex gap-2">
						{#if trx.requestLetter}
							<span class="bg-cyan-100 text-[#0188CE] text-[8px] font-black px-2 py-0.5 rounded border border-cyan-200">LETTER</span>
						{/if}
						{#if trx.status === 'REQUESTED'}
							<span class="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm">NEW REQ</span>
						{:else if trx.status === 'DRAFT'}
							<span class="bg-yellow-400 text-[#0A417A] text-[8px] font-black px-2 py-0.5 rounded shadow-sm">DRAFT</span>
						{:else if trx.status === 'APPROVED_ULP'}
							<span class="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm">CONFIRMED</span>
						{:else if trx.status === 'COMPLETED'}
							<span class="bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm italic">SUCCESS</span>
						{:else if trx.status === 'REJECTED'}
							<span class="bg-gray-800 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm">REJECTED</span>
						{/if}
					</div>

					<div class="flex items-center space-x-2 text-[10px] text-gray-400 font-black mb-4 italic">
						<span>{new Date(trx.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
						<span>•</span>
						<span class="text-[#0A417A] bg-gray-100 px-2 py-0.5 rounded">{trx.referenceNumber}</span>
					</div>

					<div class="mb-4">
						<!-- ULP Badge - always visible for non-UP3 transactions -->
						{#if trx.type === 'USAGE' && trx.targetUlpId}
							<div class="flex items-center gap-1.5 mb-2">
								<span class="text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
									<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
									Pemakaian ULP
								</span>
								<span class="text-[10px] font-black text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">{trx.ulpName}</span>
							</div>
						{:else if trx.type === 'USAGE' && !trx.targetUlpId}
							<div class="flex items-center gap-1.5 mb-2">
								<span class="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Pemakaian UP3 (Pusat)</span>
							</div>
						{:else if trx.type === 'DISTRIBUTION'}
							<div class="flex items-center gap-1.5 mb-2">
								<span class="text-[9px] font-black uppercase tracking-widest bg-cyan-100 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded-full flex items-center gap-1">
									<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
									Transfer ke
								</span>
								<span class="text-[10px] font-black text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">{trx.ulpName}</span>
							</div>
						{:else if trx.type === 'INITIAL_STOCK'}
							<div class="flex items-center gap-1.5 mb-2">
								<span class="text-[9px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Stok Awal</span>
								<span class="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">{trx.ulpName}</span>
							</div>
						{/if}

						<p class="text-base font-black text-gray-800 leading-tight">
							{#if trx.type === 'USAGE'}
								SPK: {trx.purpose || '—'}
							{:else if trx.type === 'DISTRIBUTION'}
								Penerima: {trx.takerName || '—'}
							{:else if trx.type === 'INITIAL_STOCK'}
								Input Stok Awal
							{/if}
						</p>
						<p class="text-xs text-gray-500 mt-2">
							Pengambil/Petugas: <span class="font-bold text-gray-700">{trx.takerName || '---'}</span>
						</p>
						{#if trx.firstParty}
							<p class="text-xs text-gray-500 mt-1">
								Pihak Pertama: <span class="font-bold text-[#0A417A] uppercase">{trx.firstParty}</span>
							</p>
						{/if}
					</div>

					<!-- Material List Table/Card section -->
					<div class="space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
						<div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Daftar Material:</div>
						{#each trx.items as item}
							<div class="flex justify-between items-center text-xs font-bold text-gray-600">
								<span class="truncate max-w-[200px]">{item.name}</span>
								<span class="text-gray-900 whitespace-nowrap">{item.quantity} <span class="text-[9px] font-normal text-gray-400">{item.unit}</span></span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Actions Block -->
				<div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
					<div class="flex items-center gap-2">
						<!-- Finalize transfer (UP3 only) -->
						{#if trx.status === 'APPROVED_ULP' && data.userRole === 'ADMIN_UP3'}
							<form method="POST" action="?/finalisasi" use:enhance={handleEnhance}>
								<input type="hidden" name="transactionId" value={trx.id} />
								<button type="submit" class="text-xs bg-green-500 hover:bg-green-600 text-white font-black px-4 py-2 rounded-xl shadow-md transition-all disabled:opacity-50" disabled={isSubmitting}>
									{#if isSubmitting} MEMPROSES... {:else} FINALIZE MUTASI {/if}
								</button>
							</form>
						{:else if trx.status === 'REQUESTED' && trx.type === 'INITIAL_STOCK' && data.userRole === 'ADMIN_UP3'}
							<div class="flex gap-2">
								<form method="POST" action="?/konfirmasiStokAwal" use:enhance={handleEnhance}>
									<input type="hidden" name="transactionId" value={trx.id} />
									<button type="submit" class="text-xs bg-green-500 hover:bg-green-600 text-white font-black px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50" disabled={isSubmitting}>
										SETUJU
									</button>
								</form>
								<form method="POST" action="?/tolakStokAwal" use:enhance={handleEnhance}>
									<input type="hidden" name="transactionId" value={trx.id} />
									<button type="submit" class="text-xs bg-red-500 hover:bg-red-600 text-white font-black px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50" disabled={isSubmitting}>
										TOLAK
									</button>
								</form>
							</div>
						{:else if trx.status === 'DRAFT' && trx.type === 'USAGE'}
							<!-- Inline finalization form with image capture -->
							{#if finalizingId === trx.id}
								<form method="POST" action="?/finalisasiPemakaian" use:enhance={handleEnhance} class="w-full flex flex-col gap-2">
									<input type="hidden" name="transactionId" value={trx.id} />
									<div class="flex items-center gap-2">
										<label class="cursor-pointer bg-cyan-50 text-[#0092D1] hover:bg-cyan-100 border border-cyan-200 px-3 py-2 rounded-lg font-black text-[10px] inline-flex items-center transition-all">
											📷 {photoBase64s.length > 0 ? 'TAMBAH FOTO' : 'AMBIL FOTO'}
											<input type="file" accept="image/*" multiple capture="environment" class="hidden" onchange={handlePhotoUpload} />
										</label>
										{#if photoBase64s.length > 0}
											<span class="text-[9px] text-green-600 font-bold bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">✓ {photoBase64s.length} Foto Siap</span>
										{/if}
										<button type="submit" class="bg-green-500 hover:bg-green-600 text-white font-black text-[10px] px-3 py-2 rounded-lg shadow-sm disabled:opacity-50" disabled={isSubmitting || (trx.targetUlpId !== null && photoBase64s.length === 0 && !trx.photo)}>
											{isSubmitting ? '...' : 'SELESAIKAN'}
										</button>
										<button type="button" onclick={() => { finalizingId = null; photoBase64s = []; }} class="text-[10px] text-gray-400 hover:text-gray-600 font-bold ml-auto">BATAL</button>
									</div>
									<div class="flex flex-wrap gap-1 mt-1">
										{#each photoBase64s as p, i}
											<div class="relative">
												<img src={p} class="w-10 h-10 object-cover rounded shadow-sm border border-gray-200" alt="Evident" />
												<button type="button" onclick={() => photoBase64s = photoBase64s.filter((_, idx) => idx !== i)} class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">✕</button>
												<input type="hidden" name="photoBase64[]" value={p} />
											</div>
										{/each}
									</div>
									{#if trx.targetUlpId !== null}
										<span class="text-[9px] text-red-500 font-semibold">*Foto bukti (eviden) wajib diunggah untuk pemakaian ULP.</span>
									{:else}
										<span class="text-[9px] text-gray-400 font-medium">*Foto bukti bersifat opsional untuk pemakaian UP3.</span>
									{/if}
								</form>
							{:else}
								<div class="flex items-center gap-3 w-full">
									<button onclick={() => finalizingId = trx.id} class="text-xs font-black text-cyan-600 hover:underline mr-2">Selesaikan Sekarang →</button>
									{#if trx.photo}
										{@const photos = (typeof trx.photo === 'string' && trx.photo.startsWith('[')) ? JSON.parse(trx.photo) : [trx.photo]}
										{#if photos.length === 1}
											<button type="button" onclick={() => openViewer(photos[0])} class="text-xs font-bold text-gray-500 flex items-center hover:text-gray-700 underline decoration-dotted">
												📦 Foto Bukti (Evident)
											</button>
										{:else}
											<div class="flex items-center gap-1 flex-wrap">
												<span class="text-[10px] text-gray-400 font-bold">📦 Foto Bukti:</span>
												{#each photos as p, idx}
													<button type="button" onclick={() => openViewer(p)} class="text-[10px] font-bold text-cyan-600 flex items-center hover:text-cyan-700 underline decoration-dotted bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded">
														#{idx + 1}
													</button>
												{/each}
											</div>
										{/if}
									{/if}
								</div>
							{/if}
						{:else if trx.status === 'REQUESTED' && trx.type === 'INITIAL_STOCK' && data.userRole === 'ADMIN_ULP'}
							<span class="text-[10px] text-gray-400 font-black italic">Menunggu Persetujuan UP3...</span>
						{:else if trx.status === 'COMPLETED'}
							<!-- Completed files viewing options -->
							<div class="flex items-center gap-3">
								{#if trx.photo}
									{@const photos = (typeof trx.photo === 'string' && trx.photo.startsWith('[')) ? JSON.parse(trx.photo) : [trx.photo]}
									{#if photos.length === 1}
										<button type="button" onclick={() => openViewer(photos[0])} class="text-xs font-bold text-gray-500 flex items-center hover:text-gray-700 underline decoration-dotted">
											📦 Foto Bukti (Evident)
										</button>
									{:else}
										<div class="flex items-center gap-1 flex-wrap">
											<span class="text-[10px] text-gray-400 font-bold">📦 Foto Bukti:</span>
											{#each photos as p, idx}
												<button type="button" onclick={() => openViewer(p)} class="text-[10px] font-bold text-cyan-600 flex items-center hover:text-cyan-700 underline decoration-dotted bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded">
													#{idx + 1}
												</button>
											{/each}
										</div>
									{/if}
								{/if}
								{#if trx.type === 'DISTRIBUTION'}
									<a href="/mutasi/{trx.id}/bast" target="_blank" class="text-[10px] bg-gray-100 hover:bg-gray-200 text-[#0A417A] font-black px-3 py-1.5 rounded-lg border shadow-sm transition-all italic">LIAT BAST</a>
								{/if}
							</div>
						{:else}
							<span class="text-[10px] text-gray-400 font-bold italic">Menunggu proses...</span>
						{/if}
					</div>

					<!-- Request Letter display button if present -->
					{#if trx.requestLetter}
						<button type="button" onclick={() => openViewer(trx.requestLetter)} class="text-[10px] font-bold text-cyan-600 flex items-center hover:text-cyan-700 bg-cyan-50 px-2 py-1 rounded border border-cyan-100 shrink-0">
							📄 Surat
						</button>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Lightbox Viewer Modal -->
{#if showViewer}
	<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10 backdrop-blur-sm" role="dialog" aria-modal="true" onclick={closeViewer}>
		<button class="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all" onclick={closeViewer}>
			<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
		</button>
		
		<div class="max-w-5xl w-full h-full flex flex-col items-center justify-center" onclick={(e) => e.stopPropagation()}>
			{#if viewerBase64.startsWith('data:application/pdf')}
				<iframe src={viewerBase64} class="w-full h-full rounded-xl shadow-2xl bg-white" title="Document Viewer"></iframe>
			{:else}
				<img src={viewerBase64} class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Document Preview"/>
			{/if}
			
			<div class="mt-4 flex gap-4">
				<a href={viewerBase64} download="dokumen-pln.jpg" class="bg-[#FFD500] text-[#0A417A] px-6 py-2 rounded-lg font-black text-sm shadow-xl hover:scale-105 transition-all flex items-center">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4 4m4-4H8"></path></svg>
					DOWNLOAD FILE
				</a>
				<button class="bg-white/10 text-white px-6 py-2 rounded-lg font-black text-sm shadow-xl hover:bg-white/20 transition-all" onclick={closeViewer}>
					TUTUP
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for better look */
	:global(::-webkit-scrollbar) {
		width: 6px;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: #CBD5E0;
		border-radius: 10px;
	}
</style>
