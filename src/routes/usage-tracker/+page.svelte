<script lang="ts">
	let { data } = $props();

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
</script>

<svelte:head>
	<title>Usage Tracker - Monitoring Lapangan ULP</title>
</svelte:head>

<div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
	<div>
		<h1 class="text-3xl font-bold text-[#0A417A]">Usage Tracker</h1>
		<p class="text-gray-500 mt-2">Monitoring real-time pemakaian material lapangan oleh semua unit ULP</p>
	</div>

	<div class="flex flex-col md:flex-row items-end space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto">
		<!-- Filter ULP -->
		<div class="flex flex-col w-full md:w-48">
			<label for="ulpFilter" class="text-xs text-gray-500 mb-1 font-semibold">Unit ULP:</label>
			<select 
				id="ulpFilter"
				bind:value={selectedUlpFilter}
				class="border border-gray-300 rounded-lg px-3 py-[9px] text-sm focus:ring-cyan-500 outline-none bg-white cursor-pointer hover:bg-gray-50 shadow-sm"
			>
				<option value="ALL">Semua ULP</option>
				{#each data.ulps as ulp}
					<option value={ulp.name}>{ulp.name}</option>
				{/each}
			</select>
		</div>

		<!-- Search Box -->
		<div class="w-full md:w-80 relative">
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
			</div>
			<input 
				type="text" 
				bind:value={searchQuery}
				placeholder="Cari SPK, Petugas, atau Material..." 
				class="block w-full pl-9 pr-3 py-[9px] border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm transition-all"
			/>
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
						<th class="px-6 py-4 font-semibold w-48">Petugas</th>
						<th class="px-6 py-4 font-semibold">Rincian Material</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#if filteredUsage.length === 0}
						<tr>
							<td colspan="6" class="px-6 py-10 text-center text-gray-500 bg-gray-50/50">Belum ada aktivitas lapangan untuk dipantau.</td>
						</tr>
					{:else}
						{#each filteredUsage as log, i}
							<tr class="hover:bg-gray-50/80 transition-colors duration-150 text-sm">
								<td class="px-6 py-4 text-center text-gray-400 font-medium italic">{i + 1}</td>
								<td class="px-6 py-4">
									<div class="font-bold text-[#0A417A]">{new Date(log.date).toLocaleDateString('id-ID')}</div>
									<div class="text-[11px] text-gray-400 font-medium uppercase">{log.referenceNumber}</div>
								</td>
								<td class="px-6 py-4 text-gray-700 font-medium">
									{log.ulpName}
								</td>
								<td class="px-6 py-4">
									<div class="font-medium text-gray-700 leading-snug line-clamp-2 max-w-xs">{log.purpose}</div>
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
												<span class="text-gray-600">
													{item.name}
													{#if item.description}
														<span class="text-[10px] text-cyan-600 italic ml-1">("{item.description}")</span>
													{/if}
												</span>
												<span class="font-bold text-gray-800 whitespace-nowrap">{item.quantity} <span class="text-[10px] font-normal text-gray-500">{item.unit}</span></span>
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
