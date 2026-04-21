<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	// Filters
	let searchQuery = $state('');
	let selectedUlpFilter = $state('ALL');

	let filteredUsage = $derived(
		(data.usageHistory || []).filter((item: any) => {
			const matchesSearch = item.ulpName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.takerName?.toLowerCase().includes(searchQuery.toLowerCase());
			
			const matchesUlp = selectedUlpFilter === 'ALL' || item.ulpName === selectedUlpFilter;
			
			return matchesSearch && matchesUlp;
		})
	);

	// Finalization State
	let finalizingId = $state<number | null>(null);
	let photoBase64 = $state('');
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
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			photoBase64 = await compressImage(file);
		}
	}
</script>

<svelte:head>
	<title>Usage Tracker - Monitoring Lapangan ULP</title>
</svelte:head>

<!-- Notifications -->
{#if form?.success}
	<div class="fixed top-20 right-10 z-[100] bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce">
		✅ {form.message}
	</div>
{/if}
{#if form?.error}
	<div class="fixed top-20 right-10 z-[100] bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl">
		⚠️ {form.error}
	</div>
{/if}

<div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
	<div class="flex flex-col">
		<h1 class="text-3xl font-bold text-[#0A417A] tracking-tight">Usage Tracker</h1>
		<p class="text-gray-500 mt-1.5 flex items-center gap-2">
			<span class="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
			Monitoring real-time pemakaian material {data.userRole === 'ADMIN_UP3' ? 'semua unit ULP' : 'unit anda'}
		</p>
	</div>

	<div class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
		{#if data.userRole === 'ADMIN_ULP'}
			<a href="/mutasi?tab=PEMAKAIAN" class="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white font-black text-sm py-3.5 px-8 rounded-xl shadow-lg shadow-cyan-100 transition-all flex items-center justify-center gap-2 group transform active:scale-95">
				<svg class="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
				TAMBAH PEMAKAIAN
			</a>
		{/if}
		
		<div class="flex flex-col md:flex-row items-end gap-3 w-full md:w-auto">
			{#if data.userRole === 'ADMIN_UP3'}
				<!-- Filter ULP (Only for UP3) -->
				<div class="flex flex-col w-full md:w-48">
					<label for="ulpFilter" class="text-[10px] text-gray-400 mb-1 font-black uppercase tracking-widest pl-1">Unit ULP:</label>
					<select 
						id="ulpFilter"
						bind:value={selectedUlpFilter}
						class="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all shadow-sm font-bold text-[#0A417A]"
					>
						<option value="ALL">Semua ULP</option>
						{#each data.ulps as ulp}
							<option value={ulp.name}>{ulp.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Search Box -->
			<div class="w-full md:w-80 relative">
				<label class="text-[10px] text-gray-400 mb-1 font-black uppercase tracking-widest pl-1">Cari Data:</label>
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
		</div>
	</div>
</div>

<div class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col">
	<div class="overflow-x-auto">
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-gray-50 text-gray-600 text-sm border-b border-gray-200 uppercase tracking-wider">
					<th class="px-6 py-4 font-semibold w-16 text-center italic">#</th>
					<th class="px-6 py-4 font-semibold w-40">Waktu & Ref</th>
					<th class="px-6 py-4 font-semibold w-32">Unit ULP</th>
					<th class="px-6 py-4 font-semibold">Tujuan / SPK</th>
					<th class="px-6 py-4 font-semibold w-40 text-center">Status</th>
					<th class="px-6 py-4 font-semibold w-48">Petugas</th>
					<th class="px-6 py-4 font-semibold">Rincian Material</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#if filteredUsage.length === 0}
					<tr>
						<td colspan="7" class="px-6 py-10 text-center text-gray-500 bg-gray-50/50 uppercase font-black text-xs tracking-widest italic animate-pulse">Belum ada aktivitas pemakaian yang tercatat.</td>
					</tr>
				{:else}
					{#each filteredUsage as log, i}
					<tr class="hover:bg-gray-50/80 transition-colors duration-150 text-sm {log.status === 'DRAFT' ? 'bg-orange-50/20' : ''}">
						<td class="px-6 py-4 text-center text-gray-400 font-medium italic">{i + 1}</td>
						<td class="px-6 py-4">
							<div class="font-bold text-[#0A417A] text-base">{new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
							<div class="text-[10px] text-gray-400 font-black tracking-widest uppercase mt-0.5">{log.referenceNumber}</div>
						</td>
						<td class="px-6 py-4 text-gray-700 font-medium">{log.ulpName}</td>
						<td class="px-6 py-4">
							<div class="font-medium text-gray-700 leading-snug line-clamp-2 max-w-[200px]">{log.purpose}</div>
						</td>
						<td class="px-6 py-4 text-center">
							{#if log.status === 'DRAFT'}
								<div class="flex flex-col items-center gap-2">
									<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 border border-orange-200">
										<span class="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 animate-pulse"></span>
										DRAFT
									</div>
									
									{#if data.userRole === 'ADMIN_ULP'}
										{#if finalizingId === log.id}
											<form method="POST" action="?/finalisasiDraft" use:enhance={() => {
												isSubmitting = true;
												return async ({ update }) => { isSubmitting = false; finalizingId = null; photoBase64 = ''; update(); };
											}} class="flex flex-col gap-2 p-2 border rounded-lg bg-white shadow-lg animate-in fade-in zoom-in duration-200">
												<input type="hidden" name="transactionId" value={log.id} />
												<input type="hidden" name="photoBase64" value={photoBase64} />
												<label class="cursor-pointer bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded text-[10px] font-black border border-cyan-200 text-center">
													{photoBase64 ? '✓ GANTI FOTO' : '📷 AMBIL FOTO'}
													<input type="file" accept="image/*" capture="environment" class="hidden" onchange={handlePhotoUpload} />
												</label>
												{#if photoBase64}
													<button type="submit" class="bg-green-500 text-white px-3 py-1.5 rounded text-[10px] font-black shadow-sm disabled:opacity-50" disabled={isSubmitting}>
														{isSubmitting ? '...' : 'SELESAIKAN'}
													</button>
												{/if}
												<button type="button" onclick={() => { finalizingId = null; photoBase64 = ''; }} class="text-[9px] text-gray-400 font-bold">BATAL</button>
											</form>
										{:else}
											<button onclick={() => finalizingId = log.id} class="text-[10px] font-black text-cyan-600 hover:underline">Selesaikan Sekarang →</button>
										{/if}
									{/if}
								</div>
							{:else}
								<div class="inline-flex flex-col items-center">
									<div class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 border border-green-200 mb-1">
										VALID
									</div>
									{#if log.photo}
										<div class="group relative">
											<svg class="w-4 h-4 text-cyan-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
											<div class="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block z-50 bg-white border p-1 rounded shadow-xl mb-2">
												<img src={log.photo} class="max-w-[150px] h-auto rounded" alt="Bukti Pemasangan"/>
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</td>
								<td class="px-6 py-4">
									<div class="flex items-center">
										<div class="w-7 h-7 rounded-full bg-cyan-50 flex items-center justify-center mr-2 shrink-0 text-[#0A417A] border border-cyan-100">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
										</div>
										<span class="text-gray-700 font-medium truncate">{log.takerName}</span>
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="space-y-1">
										{#each log.items as item}
											<div class="flex items-center justify-between gap-4 border-b border-gray-50 last:border-0 pb-1 last:pb-0">
												<span class="text-gray-600 truncate max-w-[120px]">
													{item.name}
												</span>
												<span class="font-bold text-gray-800 whitespace-nowrap">{item.quantity} <span class="text-[9px] font-normal text-gray-500">{item.unit}</span></span>
											</div>
										{/each}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

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
