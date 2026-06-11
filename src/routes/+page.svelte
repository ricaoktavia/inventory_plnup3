<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard - SIMOGU PLN UP3 Madura</title>
</svelte:head>

<div class="mb-8 flex items-end justify-between">
	<div>
		<h1 class="text-3xl font-bold text-[#0A417A]">Dashboard Analitik</h1>
		<p class="mt-2 text-gray-500">
			Pusat Informasi & Statistik {data.role === 'ADMIN_UP3'
				? 'Gudang Utama UP3'
				: `Logistik ULP ${data.ulpName}`}
		</p>
	</div>
</div>

<!-- SECTION 1: SMART ALERTS -->
{#if (data.criticalStocksCount ?? 0) > 0 || (data.pendingDraftsCount ?? 0) > 0}
	<div class="mb-8 space-y-4">
		{#if (data.pendingDraftsCount ?? 0) > 0}
			<div
				class="flex animate-pulse items-start rounded-r-lg border-l-4 border-cyan-500 bg-cyan-50 p-4 shadow-sm"
			>
				<svg
					class="mt-0.5 mr-3 h-6 w-6 shrink-0 text-cyan-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path></svg
				>
				<div>
					<h3 class="text-sm font-bold text-cyan-800">Validasi Menunggu</h3>
					<p class="mt-1 text-sm text-cyan-700">
						Terdapat <strong>{data.pendingDraftsCount}</strong> dokumen draf dari UP3 yang menunggu verifikasi
						foto bukti oleh Anda.
					</p>
					<a
						href="/mutasi"
						class="mt-2 inline-block rounded bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800 transition-colors hover:bg-cyan-200"
						>Tindak Lanjuti Sekarang &rarr;</a
					>
				</div>
			</div>
		{/if}

		{#if (data.criticalStocksCount ?? 0) > 0}
			<div class="flex items-start rounded-r-lg border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
				<svg
					class="mt-0.5 mr-3 h-6 w-6 shrink-0 text-red-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					></path></svg
				>
				<div>
					<h3 class="text-sm font-bold text-red-800">Peringatan: Stok Menipis</h3>
					<p class="mt-1 text-sm text-red-700">
						Terdapat <strong class="text-base font-extrabold text-red-900"
							>{data.criticalStocksCount}</strong
						>
						katalog material yang stoknya kurang dari
						<strong class="text-red-900">{data.limitQuantity}</strong> unit. Segera cek daftar inventory
						untuk melakukan penyesuaian/restock.
					</p>
				</div>
			</div>
		{/if}
	</div>
{/if}

<!-- SECTION 2: KPI CARDS -->
<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
	<!-- Total Jenis Material -->
	<div
		class="group relative overflow-hidden rounded-xl border border-transparent bg-gradient-to-br from-[#06539C] to-[#0A6DB6] p-6 text-center text-white shadow-lg"
	>
		<div
			class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white opacity-5 blur-xl transition-transform group-hover:scale-150"
		></div>
		<p class="mb-2 text-sm font-medium tracking-wider text-white/80 uppercase">
			Total Jenis Katalog Master
		</p>
		<h3 class="text-5xl font-bold">{data.kpi?.totalMaterials || 0}</h3>
	</div>

	<!-- Mutasi Keluar -->
	<div
		class="group relative overflow-hidden rounded-xl border border-transparent bg-gradient-to-br from-[#FFD500] to-[#FFAB00] p-6 text-center text-white shadow-lg"
	>
		<div
			class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white opacity-20 blur-xl transition-transform group-hover:scale-150"
		></div>
		<p class="mb-2 text-sm font-medium tracking-wider text-[#A66C00] uppercase">
			Total Transaksi {data.role === 'ADMIN_UP3' ? 'Transfer' : 'Pemakaian'}
		</p>
		<h3 class="text-5xl font-bold text-white drop-shadow-sm">{data.kpi?.mutasiKeluar || 0}</h3>
	</div>
</div>

<!-- SECTION 3 & 4: CHARTS & LOGS -->
<div class="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
	<!-- Top 5 Fast Moving Bar Chart -->
	<div class="rounded-xl border border-gray-100 bg-white p-6 shadow">
		<div class="mb-6 flex items-center justify-between">
			<h3 class="text-sm font-bold text-[#0A417A] uppercase">Top 5 Fast-Moving Material</h3>
			<span class="text-xs text-gray-400">Berdasar Volume Keluar</span>
		</div>

		{#if (data.top5Materials?.length ?? 0) === 0}
			<div class="flex h-48 items-center justify-center text-sm text-gray-400">
				Belum ada data pergerakan barang.
			</div>
		{:else}
			<!-- Bar chart container layout -->
			<div
				class="flex h-48 w-full items-end justify-around gap-4 border-b border-gray-200 px-2 pb-2"
			>
				{#each data.top5Materials as mat}
					<div class="group relative flex h-full flex-1 flex-col items-center justify-end">
						<div
							class="absolute -top-7 z-10 rounded bg-gray-800 px-2 py-1 text-[10px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100"
						>
							{mat.total} Pcs
						</div>
						<div
							class="relative w-full max-w-[50px] overflow-hidden rounded-t-sm bg-gradient-to-t from-[#0A6DB6] to-[#0092D1] shadow-sm transition-all hover:to-[#0188CE]"
							style="height: {mat.percentage}%;"
						>
							<div class="absolute inset-0 h-1 w-full bg-white/20"></div>
						</div>
					</div>
				{/each}
			</div>
			<!-- Labels -->
			<div
				class="mt-3 flex w-full items-start justify-around text-center text-[10px] font-semibold text-gray-500"
			>
				{#each data.top5Materials as mat}
					<span class="flex-1 px-1 leading-tight break-words whitespace-normal" title={mat.name}
						>{mat.name}</span
					>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent Activities Table -->
	<div class="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-6 shadow">
		<div class="mb-6 flex items-center justify-between">
			<h3 class="text-sm font-bold text-[#0A417A] uppercase">Log Aktivitas Terbaru</h3>
			<a href="/mutasi" class="text-xs font-bold text-cyan-600 hover:text-cyan-800">Lihat Semua</a>
		</div>

		{#if (data.recentLogs?.length ?? 0) === 0}
			<div class="flex flex-1 items-center justify-center text-sm text-gray-400">
				Belum ada histori transaksi.
			</div>
		{:else}
			<div class="space-y-4">
				{#each data.recentLogs as log}
					<div
						class="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
					>
						<div>
							<div class="flex items-center space-x-2">
								<span class="text-xs font-bold text-gray-800">{log.ref}</span>
								{#if log.type === 'USAGE'}
									<span
										class="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700"
										>PEMAKAIAN</span
									>
								{:else}
									<span class="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700"
										>MUTASI</span
									>
								{/if}
							</div>
							<p class="mt-1 text-xs text-gray-500">
								{log.type === 'USAGE'
									? `Oleh: ${log.takerName} (Tim Lapangan)`
									: `Ke ULP: ${log.ulpName} (Oleh: ${log.takerName})`}
							</p>
						</div>
						<div class="text-right">
							<div class="mb-1 text-[10px] font-semibold text-gray-400">
								{new Date(log.date).toLocaleDateString('id-ID', {
									month: 'short',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</div>
							{#if log.status === 'DRAFT'}
								<span
									class="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600"
									>DRAFT</span
								>
							{:else if log.status === 'APPROVED_ULP'}
								<span
									class="rounded border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-600"
									>VERIFIED</span
								>
							{:else}
								<span
									class="rounded border border-green-200 px-1.5 py-0.5 text-[10px] font-bold text-green-600"
									>SELESAI</span
								>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
