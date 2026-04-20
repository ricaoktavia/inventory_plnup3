<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard - SIMOGU PLN UP3 Madura</title>
</svelte:head>

<div class="mb-8 flex justify-between items-end">
	<div>
		<h1 class="text-3xl font-bold text-[#0A417A]">
			Dashboard Analitik
		</h1>
		<p class="text-gray-500 mt-2">Pusat Informasi & Statistik {data.role === 'ADMIN_UP3' ? 'Gudang Utama UP3' : `Logistik ULP ${data.ulpName}`}</p>
	</div>
</div>

<!-- SECTION 1: SMART ALERTS -->
{#if data.criticalStocks?.length > 0 || data.pendingDraftsCount > 0}
	<div class="mb-8 space-y-4">
		{#if data.pendingDraftsCount > 0}
			<div class="bg-cyan-50 border-l-4 border-cyan-500 p-4 rounded-r-lg shadow-sm flex items-start animate-pulse">
				<svg class="h-6 w-6 text-cyan-500 mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
				<div>
					<h3 class="text-cyan-800 font-bold text-sm">Validasi Menunggu</h3>
					<p class="text-cyan-700 text-sm mt-1">Terdapat <strong>{data.pendingDraftsCount}</strong> dokumen draf dari UP3 yang menunggu verifikasi foto bukti oleh Anda.</p>
					<a href="/mutasi" class="inline-block mt-2 text-xs font-bold bg-cyan-100 text-cyan-800 px-3 py-1 rounded hover:bg-cyan-200 transition-colors">Tindak Lanjuti Sekarang &rarr;</a>
				</div>
			</div>
		{/if}

		{#if data.criticalStocks?.length > 0}
			<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start">
				<svg class="h-6 w-6 text-red-500 mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
				<div class="w-full">
					<h3 class="text-red-800 font-bold text-sm">Peringatan: Stok Kritis (&lt; 100)</h3>
					<p class="text-red-700 text-sm mt-1">Material berikut stoknya hampir habis dan memerlukan RESTOCK:</p>
					<div class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
						{#each data.criticalStocks as stock}
							<div class="bg-white border border-red-200 p-2 rounded text-xs flex justify-between shadow-sm">
								<span class="font-semibold text-gray-700 truncate mr-2" title={stock.name}>{stock.name}</span>
								<span class="font-bold text-red-600 shrink-0">{stock.quantity} {stock.unit}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<!-- SECTION 2: KPI CARDS -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
	<!-- Total Jenis Material -->
	<div class="bg-gradient-to-br from-[#06539C] to-[#0A6DB6] rounded-xl shadow-lg border border-transparent p-6 text-white text-center relative overflow-hidden group">
		<div class="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-5 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
		<p class="text-sm font-medium text-white/80 uppercase tracking-wider mb-2">Total Jenis Katalog Master</p>
		<h3 class="text-5xl font-bold">{data.kpi.totalMaterials || 0}</h3>
	</div>

	<!-- Mutasi Keluar -->
	<div class="bg-gradient-to-br from-[#FFD500] to-[#FFAB00] rounded-xl shadow-lg border border-transparent p-6 text-white text-center relative overflow-hidden group">
		<div class="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-20 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
		<p class="text-sm font-medium text-[#A66C00] uppercase tracking-wider mb-2">Total Transaksi {data.role === 'ADMIN_UP3' ? 'Distribusi' : 'Pemakaian'}</p>
		<h3 class="text-5xl font-bold text-white drop-shadow-sm">{data.kpi.mutasiKeluar || 0}</h3>
	</div>
</div>

<!-- SECTION 3 & 4: CHARTS & LOGS -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-start">
	
	<!-- Top 5 Fast Moving Bar Chart -->
	<div class="bg-white rounded-xl shadow border border-gray-100 p-6">
		<div class="flex justify-between items-center mb-6">
			<h3 class="text-sm font-bold text-[#0A417A] uppercase">Top 5 Fast-Moving Material</h3>
			<span class="text-xs text-gray-400">Berdasar Volume Keluar</span>
		</div>
		
		{#if data.top5Materials.length === 0}
			<div class="h-48 flex items-center justify-center text-gray-400 text-sm">Belum ada data pergerakan barang.</div>
		{:else}
			<!-- Bar chart container layout -->
			<div class="w-full flex items-end justify-around h-48 px-2 gap-4 pb-2 border-b border-gray-200">
				{#each data.top5Materials as mat}
					<div class="relative group flex flex-col items-center flex-1 h-full justify-end">
						<div class="absolute -top-7 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[10px] px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">
							{mat.total} Pcs
						</div>
						<div class="w-full max-w-[50px] bg-gradient-to-t from-[#0A6DB6] to-[#0092D1] hover:to-[#0188CE] rounded-t-sm transition-all relative overflow-hidden shadow-sm" style="height: {mat.percentage}%;">
							<div class="absolute inset-0 bg-white/20 w-full h-1"></div>
						</div>
					</div>
				{/each}
			</div>
			<!-- Labels -->
			<div class="w-full flex justify-around text-[10px] text-gray-500 font-semibold mt-3 text-center">
				{#each data.top5Materials as mat}
					<span class="flex-1 truncate px-1" title={mat.name}>{mat.name}</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent Activities Table -->
	<div class="bg-white rounded-xl shadow border border-gray-100 p-6 h-full flex flex-col">
		<div class="flex justify-between items-center mb-6">
			<h3 class="text-sm font-bold text-[#0A417A] uppercase">Log Aktivitas Terbaru</h3>
			<a href="/mutasi" class="text-xs font-bold text-cyan-600 hover:text-cyan-800">Lihat Semua</a>
		</div>

		{#if data.recentLogs.length === 0}
			<div class="flex-1 flex items-center justify-center text-gray-400 text-sm">Belum ada histori transaksi.</div>
		{:else}
			<div class="space-y-4">
				{#each data.recentLogs as log}
					<div class="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
						<div>
							<div class="flex items-center space-x-2">
								<span class="font-bold text-xs text-gray-800">{log.ref}</span>
								{#if log.type === 'USAGE'}
									<span class="bg-orange-100 text-orange-700 text-[9px] font-bold px-1.5 py-0.5 rounded">PEMAKAIAN</span>
								{:else}
									<span class="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded">MUTASI</span>
								{/if}
							</div>
							<p class="text-xs text-gray-500 mt-1">
								{log.type === 'USAGE' ? `Oleh: ${log.takerName} (Tim Lapangan)` : `Ke ULP: ${log.ulpName} (Oleh: ${log.takerName})`}
							</p>
						</div>
						<div class="text-right">
							<div class="text-[10px] text-gray-400 font-semibold mb-1">
								{new Date(log.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
							</div>
							{#if log.status === 'DRAFT'}
								<span class="text-[10px] text-gray-600 font-bold border border-gray-200 px-1.5 py-0.5 rounded">DRAFT</span>
							{:else if log.status === 'APPROVED_ULP'}
								<span class="text-[10px] text-blue-600 font-bold border border-blue-200 px-1.5 py-0.5 rounded">VERIFIED</span>
							{:else}
								<span class="text-[10px] text-green-600 font-bold border border-green-200 px-1.5 py-0.5 rounded">SELESAI</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

</div>
