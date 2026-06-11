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
			const matchesSearch =
				item.ulpName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.takerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(item.items || []).some((i: any) =>
					i.name.toLowerCase().includes(searchQuery.toLowerCase())
				);

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

	// Pagination
	let currentPage = $state(1);
	const itemsPerPage = 20;

	$effect(() => {
		// Reset to page 1 when any filter changes
		searchQuery;
		selectedUlpFilter;
		typeFilter;
		currentPage = 1;
	});

	let paginatedHistory = $derived(
		filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let totalPages = $derived(Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage)));

	// Lightbox Viewer Modal State
	let viewerImages = $state<string[]>([]);
	let showViewer = $state(false);

	function openViewer(dataUrls: string | string[]) {
		if (!dataUrls || (Array.isArray(dataUrls) && dataUrls.length === 0)) return;
		viewerImages = Array.isArray(dataUrls) ? dataUrls : [dataUrls];
		showViewer = true;
	}

	function closeViewer() {
		showViewer = false;
		viewerImages = [];
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
		return async ({ result, update }: { result: any; update: any }) => {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, 2000 - elapsed);
			if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
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
	<div
		class="fixed top-20 right-10 z-[100] animate-bounce rounded-xl bg-green-500 px-6 py-3 text-white shadow-2xl"
	>
		✅ {form.message}
	</div>
{/if}
{#if form?.error}
	<div
		class="fixed top-20 right-10 z-[100] animate-pulse rounded-xl bg-red-500 px-6 py-3 text-white shadow-2xl"
	>
		⚠️ {form.error}
	</div>
{/if}

<!-- Header -->
<div
	class="mx-auto mb-8 flex max-w-[1200px] flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
>
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-[#0A417A]">Usage & Mutation Tracker</h1>
			<p class="mt-1.5 flex items-center gap-2 text-gray-500">
				<span class="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-500"></span>
				Monitoring real-time transaksi, mutasi, & pemakaian lapangan {data.userRole === 'ADMIN_UP3'
					? 'semua unit ULP'
					: 'unit anda'}
			</p>
		</div>
		{#if data.userRole === 'ADMIN_ULP'}
			<a
				href="/mutasi?tab=PEMAKAIAN"
				class="group flex w-full transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-100 transition-all hover:from-cyan-700 hover:to-blue-800 active:scale-95 md:w-auto"
			>
				<svg
					class="h-4 w-4 transition-transform duration-300 group-hover:rotate-90"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
					></path></svg
				>
				TAMBAH PEMAKAIAN
			</a>
		{/if}
	</div>

	<!-- Search Box -->
	<div class="mb-4">
		<label class="mb-1.5 block pl-1 text-[10px] font-black tracking-widest text-gray-400 uppercase"
			>Cari Data:</label
		>
		<div class="relative">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					></path></svg
				>
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari SPK, Petugas, Material..."
				class="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-4 pl-10 text-sm font-medium shadow-sm transition-all outline-none focus:ring-2 focus:ring-cyan-500"
			/>
		</div>
	</div>

	<!-- Blue Gradient Filter Bar (One Row for Unit ULP and Tipe Transaksi) -->
	<div
		class="mb-2 flex flex-col items-end gap-4 rounded-xl bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4] p-4 text-white shadow-md md:flex-row"
	>
		<!-- Type Filter Tabs -->
		<div class="w-full flex-1">
			<label
				class="mb-1.5 block pl-1 text-[10px] font-black tracking-widest text-white/90 uppercase"
				>Tipe Transaksi:</label
			>
			<div class="flex rounded-xl border border-white/20 bg-white/10 p-0.5">
				<button
					class="flex-1 rounded-lg py-2 text-[8.5px] font-black transition-all {typeFilter === 'ALL'
						? 'bg-white text-[#0A417A] shadow-sm'
						: 'text-white hover:bg-white/10'}"
					onclick={() => (typeFilter = 'ALL')}
				>
					SEMUA
				</button>
				<button
					class="flex-1 rounded-lg py-2 text-[8.5px] font-black transition-all {typeFilter ===
					'DISTRIBUTION'
						? 'bg-white text-blue-600 shadow-sm'
						: 'text-white hover:bg-white/10'}"
					onclick={() => (typeFilter = 'DISTRIBUTION')}
				>
					TRANSFER MATERIAL
				</button>
				{#if data.userRole === 'ADMIN_UP3'}
					<button
						class="flex-1 rounded-lg py-2 text-[8.5px] font-black transition-all {typeFilter ===
						'USAGE_UP3'
							? 'bg-white text-orange-600 shadow-sm'
							: 'text-white hover:bg-white/10'}"
						onclick={() => (typeFilter = 'USAGE_UP3')}
					>
						PEMAKAIAN UP3
					</button>
					<button
						class="flex-1 rounded-lg py-2 text-[8.5px] font-black transition-all {typeFilter ===
						'USAGE_ULP'
							? 'bg-white text-orange-600 shadow-sm'
							: 'text-white hover:bg-white/10'}"
						onclick={() => (typeFilter = 'USAGE_ULP')}
					>
						PEMAKAIAN ULP
					</button>
				{:else}
					<button
						class="flex-1 rounded-lg py-2 text-[8.5px] font-black transition-all {typeFilter ===
						'USAGE'
							? 'bg-white text-orange-600 shadow-sm'
							: 'text-white hover:bg-white/10'}"
						onclick={() => (typeFilter = 'USAGE')}
					>
						PEMAKAIAN
					</button>
				{/if}
				<button
					class="flex-1 rounded-lg py-2 text-[8.5px] font-black transition-all {typeFilter ===
					'INITIAL_STOCK'
						? 'bg-white text-purple-600 shadow-sm'
						: 'text-white hover:bg-white/10'}"
					onclick={() => (typeFilter = 'INITIAL_STOCK')}
				>
					STOK AWAL
				</button>
			</div>
		</div>

		<!-- ULP Filter -->
		{#if data.userRole === 'ADMIN_UP3'}
			<div class="w-full flex-1">
				<label
					for="ulpFilter"
					class="mb-1.5 block pl-1 text-[10px] font-black tracking-widest text-white/90 uppercase"
					>Unit ULP:</label
				>
				<select
					id="ulpFilter"
					bind:value={selectedUlpFilter}
					class="w-full cursor-pointer rounded-xl border-none bg-white/20 px-4 py-2 text-xs font-bold text-white shadow-inner transition-all outline-none hover:bg-white/30 focus:ring-2 focus:ring-cyan-300"
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
<div class="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-1 md:grid-cols-2">
	{#if filteredHistory.length === 0}
		<div
			class="rounded-2xl border border-gray-100 bg-white p-12 text-center font-bold tracking-wider text-gray-500 uppercase italic shadow-sm md:col-span-2"
		>
			Belum ada data riwayat transaksi yang cocok.
		</div>
	{:else}
		{#each paginatedHistory as trx}
			<div
				class="relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md {trx.status ===
				'COMPLETED'
					? ''
					: 'border-dashed bg-gray-50/50'}"
			>
				<div>
					<!-- Floating Status Badge -->
					<div class="absolute top-6 right-6 flex gap-2">
						{#if trx.requestLetter}
							<span
								class="rounded border border-cyan-200 bg-cyan-100 px-2 py-0.5 text-[8px] font-black text-[#0188CE]"
								>LETTER</span
							>
						{/if}
						{#if trx.status === 'REQUESTED'}
							<span
								class="rounded bg-red-500 px-2 py-0.5 text-[8px] font-black text-white shadow-sm"
								>NEW REQ</span
							>
						{:else if trx.status === 'DRAFT'}
							<span
								class="rounded bg-yellow-400 px-2 py-0.5 text-[8px] font-black text-[#0A417A] shadow-sm"
								>DRAFT</span
							>
						{:else if trx.status === 'APPROVED_ULP'}
							<span
								class="rounded bg-blue-600 px-2 py-0.5 text-[8px] font-black text-white shadow-sm"
								>CONFIRMED</span
							>
						{:else if trx.status === 'COMPLETED'}
							<span
								class="rounded bg-green-500 px-2 py-0.5 text-[8px] font-black text-white italic shadow-sm"
								>SUCCESS</span
							>
						{:else if trx.status === 'REJECTED'}
							<span
								class="rounded bg-gray-800 px-2 py-0.5 text-[8px] font-black text-white shadow-sm"
								>REJECTED</span
							>
						{/if}
					</div>

					<div class="mb-4 flex items-center space-x-2 text-[10px] font-black text-gray-400 italic">
						<span
							>{new Date(trx.date).toLocaleDateString('id-ID', {
								day: '2-digit',
								month: 'short',
								year: 'numeric'
							})}</span
						>
						<span>•</span>
						<span class="rounded bg-gray-100 px-2 py-0.5 text-[#0A417A]">{trx.referenceNumber}</span
						>
					</div>

					<div class="mb-4">
						<!-- ULP Badge - always visible for non-UP3 transactions -->
						{#if trx.type === 'USAGE' && trx.targetUlpId}
							<div class="mb-2 flex items-center gap-1.5">
								<span
									class="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[9px] font-black tracking-widest text-orange-700 uppercase"
								>
									<svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
										></path></svg
									>
									Pemakaian ULP
								</span>
								<span
									class="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700"
									>{trx.ulpName}</span
								>
							</div>
						{:else if trx.type === 'USAGE' && !trx.targetUlpId}
							<div class="mb-2 flex items-center gap-1.5">
								<span
									class="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[9px] font-black tracking-widest text-blue-700 uppercase"
									>Pemakaian UP3 (Pusat)</span
								>
							</div>
						{:else if trx.type === 'DISTRIBUTION'}
							<div class="mb-2 flex items-center gap-1.5">
								<span
									class="flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-100 px-2 py-0.5 text-[9px] font-black tracking-widest text-cyan-700 uppercase"
								>
									<svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
										></path></svg
									>
									Transfer ke
								</span>
								<span
									class="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-700"
									>{trx.ulpName}</span
								>
							</div>
						{:else if trx.type === 'INITIAL_STOCK'}
							<div class="mb-2 flex items-center gap-1.5">
								<span
									class="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[9px] font-black tracking-widest text-purple-700 uppercase"
									>Stok Awal</span
								>
								<span
									class="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700"
									>{trx.ulpName}</span
								>
							</div>
						{/if}

						<p class="text-base leading-tight font-black text-gray-800">
							{#if trx.type === 'USAGE'}
								SPK: {trx.purpose || '—'}
							{:else if trx.type === 'DISTRIBUTION'}
								Penerima: {trx.takerName || '—'}
							{:else if trx.type === 'INITIAL_STOCK'}
								Input Stok Awal
							{/if}
						</p>
						<p class="mt-2 text-xs text-gray-500">
							Pengambil/Petugas: <span class="font-bold text-gray-700"
								>{trx.takerName || '---'}</span
							>
						</p>
						{#if trx.firstParty}
							<p class="mt-1 text-xs text-gray-500">
								Pihak Pertama: <span class="font-bold text-[#0A417A] uppercase"
									>{trx.firstParty}</span
								>
							</p>
						{/if}
					</div>

					<!-- Material List Table/Card section -->
					<div class="mb-4 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-4">
						<div class="mb-1 text-[9px] font-bold tracking-widest text-gray-400 uppercase">
							Daftar Material:
						</div>
						{#each trx.items as item}
							<div class="flex items-center justify-between text-xs font-bold text-gray-600">
								<span class="max-w-[200px] truncate">{item.name}</span>
								<span class="whitespace-nowrap text-gray-900"
									>{item.quantity}
									<span class="text-[9px] font-normal text-gray-400">{item.unit}</span></span
								>
							</div>
						{/each}
					</div>
				</div>

				<!-- Actions Block -->
				<div class="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-3">
					<div class="flex items-center gap-2">
						<!-- Finalize transfer (UP3 only) -->
						{#if trx.status === 'APPROVED_ULP' && data.userRole === 'ADMIN_UP3'}
							<form method="POST" action="?/finalisasi" use:enhance={handleEnhance}>
								<input type="hidden" name="transactionId" value={trx.id} />
								<button
									type="submit"
									class="rounded-xl bg-green-500 px-4 py-2 text-xs font-black text-white shadow-md transition-all hover:bg-green-600 disabled:opacity-50"
									disabled={isSubmitting}
								>
									{#if isSubmitting}
										MEMPROSES...
									{:else}
										FINALIZE MUTASI
									{/if}
								</button>
							</form>
						{:else if trx.status === 'REQUESTED' && trx.type === 'INITIAL_STOCK' && data.userRole === 'ADMIN_UP3'}
							<div class="flex gap-2">
								<form method="POST" action="?/konfirmasiStokAwal" use:enhance={handleEnhance}>
									<input type="hidden" name="transactionId" value={trx.id} />
									<button
										type="submit"
										class="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-black text-white shadow-sm transition-all hover:bg-green-600 disabled:opacity-50"
										disabled={isSubmitting}
									>
										SETUJU
									</button>
								</form>
								<form method="POST" action="?/tolakStokAwal" use:enhance={handleEnhance}>
									<input type="hidden" name="transactionId" value={trx.id} />
									<button
										type="submit"
										class="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow-sm transition-all hover:bg-red-600 disabled:opacity-50"
										disabled={isSubmitting}
									>
										TOLAK
									</button>
								</form>
							</div>
						{:else if trx.status === 'DRAFT' && trx.type === 'USAGE'}
							<!-- Inline finalization form with image capture -->
							{#if finalizingId === trx.id}
								<form
									method="POST"
									action="?/finalisasiPemakaian"
									use:enhance={handleEnhance}
									class="flex w-full flex-col gap-2"
								>
									<input type="hidden" name="transactionId" value={trx.id} />
									<div class="flex items-center gap-2">
										<label
											class="inline-flex cursor-pointer items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-black text-[#0092D1] transition-all hover:bg-cyan-100"
										>
											📷 {photoBase64s.length > 0 ? 'TAMBAH FOTO' : 'AMBIL FOTO'}
											<input
												type="file"
												accept="image/*"
												multiple
												capture="environment"
												class="hidden"
												onchange={handlePhotoUpload}
											/>
										</label>
										{#if photoBase64s.length > 0}
											<span
												class="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-600"
												>✓ {photoBase64s.length} Foto Siap</span
											>
										{/if}
										<button
											type="submit"
											class="rounded-lg bg-green-500 px-3 py-2 text-[10px] font-black text-white shadow-sm hover:bg-green-600 disabled:opacity-50"
											disabled={isSubmitting ||
												(trx.targetUlpId !== null && photoBase64s.length === 0 && !trx.photo)}
										>
											{isSubmitting ? '...' : 'SELESAIKAN'}
										</button>
										<button
											type="button"
											onclick={() => {
												finalizingId = null;
												photoBase64s = [];
											}}
											class="ml-auto text-[10px] font-bold text-gray-400 hover:text-gray-600"
											>BATAL</button
										>
									</div>
									<div class="mt-1 flex flex-wrap gap-1">
										{#each photoBase64s as p, i}
											<div class="relative">
												<img
													src={p}
													class="h-10 w-10 rounded border border-gray-200 object-cover shadow-sm"
													alt="Evident"
												/>
												<button
													type="button"
													onclick={() =>
														(photoBase64s = photoBase64s.filter((_, idx) => idx !== i))}
													class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white"
													>✕</button
												>
												<input type="hidden" name="photoBase64[]" value={p} />
											</div>
										{/each}
									</div>
									{#if trx.targetUlpId !== null}
										<span class="text-[9px] font-semibold text-red-500"
											>*Foto bukti (eviden) wajib diunggah untuk pemakaian ULP.</span
										>
									{:else}
										<span class="text-[9px] font-medium text-gray-400"
											>*Foto bukti bersifat opsional untuk pemakaian UP3.</span
										>
									{/if}
								</form>
							{:else}
								<div class="flex w-full items-center gap-3">
									<button
										onclick={() => (finalizingId = trx.id)}
										class="mr-2 text-xs font-black text-cyan-600 hover:underline"
										>Selesaikan Sekarang →</button
									>
									{#if trx.photo}
										{@const photos =
											typeof trx.photo === 'string' && trx.photo.startsWith('[')
												? JSON.parse(trx.photo)
												: [trx.photo]}
										<button
											type="button"
											onclick={() => openViewer(photos)}
											class="flex items-center text-xs font-bold text-gray-500 underline decoration-dotted hover:text-gray-700"
										>
											📦 {photos.length > 1
												? `Semua Foto Bukti (${photos.length})`
												: 'Foto Bukti (Eviden)'}
										</button>
									{/if}
								</div>
							{/if}
						{:else if trx.status === 'REQUESTED' && trx.type === 'INITIAL_STOCK' && data.userRole === 'ADMIN_ULP'}
							<span class="text-[10px] font-black text-gray-400 italic"
								>Menunggu Persetujuan UP3...</span
							>
						{:else if trx.status === 'COMPLETED'}
							<!-- Completed files viewing options -->
							<div class="flex items-center gap-3">
								{#if trx.photo}
									{@const photos =
										typeof trx.photo === 'string' && trx.photo.startsWith('[')
											? JSON.parse(trx.photo)
											: [trx.photo]}
									<button
										type="button"
										onclick={() => openViewer(photos)}
										class="flex items-center text-xs font-bold text-gray-500 underline decoration-dotted hover:text-gray-700"
									>
										📦 {photos.length > 1
											? `Semua Foto Bukti (${photos.length})`
											: 'Foto Bukti (Eviden)'}
									</button>
								{/if}
								{#if trx.type === 'DISTRIBUTION'}
									<a
										href="/mutasi/{trx.id}/bast"
										target="_blank"
										class="rounded-lg border bg-gray-100 px-3 py-1.5 text-[10px] font-black text-[#0A417A] italic shadow-sm transition-all hover:bg-gray-200"
										>LIAT BAST</a
									>
								{/if}
							</div>
						{:else}
							<span class="text-[10px] font-bold text-gray-400 italic">Menunggu proses...</span>
						{/if}
					</div>

					{#if trx.requestLetter}
						<button
							type="button"
							onclick={() => openViewer([trx.requestLetter])}
							class="flex shrink-0 items-center rounded border border-cyan-100 bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-600 hover:text-cyan-700"
						>
							📄 Surat
						</button>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Pagination Controls -->
{#if filteredHistory.length > itemsPerPage}
	<div
		class="mx-auto mt-8 flex w-full max-w-[1200px] items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
	>
		<button
			class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={currentPage === 1}
			onclick={() => (currentPage -= 1)}
		>
			← Sebelumnya
		</button>
		<p class="text-xs font-bold text-gray-500">
			Halaman <span class="text-sm text-[#0A417A]">{currentPage}</span> dari {totalPages}
		</p>
		<button
			class="rounded-lg bg-[#0A417A] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={currentPage >= totalPages}
			onclick={() => (currentPage += 1)}
		>
			Selanjutnya →
		</button>
	</div>
{/if}

<!-- Lightbox Viewer Modal -->
{#if showViewer}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm md:p-10"
		role="dialog"
		aria-modal="true"
		onclick={closeViewer}
	>
		<button
			class="absolute top-6 right-6 z-10 rounded-full bg-white/10 p-2 text-white transition-all hover:bg-white/20"
			onclick={closeViewer}
		>
			<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				></path></svg
			>
		</button>

		<div
			class="custom-scroll flex h-[90vh] w-full max-w-5xl flex-col items-center gap-8 overflow-y-auto py-8"
			onclick={(e) => e.stopPropagation()}
		>
			{#each viewerImages as image, idx}
				<div class="relative flex w-full flex-col items-center gap-4 rounded-xl bg-white/5 p-4">
					{#if image.startsWith('data:application/pdf')}
						<iframe
							src={image}
							class="h-[70vh] w-full rounded-xl bg-white shadow-2xl"
							title="Document Viewer {idx + 1}"
						></iframe>
					{:else}
						<img
							src={image}
							class="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
							alt="Document Preview {idx + 1}"
						/>
					{/if}

					<div class="mt-2 flex gap-4">
						<a
							href={image}
							download="dokumen-pln-{idx + 1}.jpg"
							class="flex items-center rounded-lg bg-[#FFD500] px-6 py-2 text-sm font-black text-[#0A417A] shadow-xl transition-all hover:scale-105"
						>
							<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4 4m4-4H8"
								></path></svg
							>
							DOWNLOAD FOTO {viewerImages.length > 1 ? `#${idx + 1}` : ''}
						</a>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for better look */
	:global(::-webkit-scrollbar) {
		width: 6px;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: #cbd5e0;
		border-radius: 10px;
	}
</style>
