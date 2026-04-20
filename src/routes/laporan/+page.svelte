<script lang="ts">
	import { exportToCSV } from '$lib/utils/export';
	
	let { data } = $props();

	function handleDownload() {
		const filename = `Laporan_Mutasi_${data.selectedUlpId}_${data.startDate}_sd_${data.endDate}.csv`;
		const exportData = data.reportData.map(item => ({
			'Material': item.name,
			'Satuan': item.unit,
			'Stok Awal': item.awal,
			'Masuk': item.masuk,
			'Keluar': item.keluar,
			'Stok Akhir': item.akhir
		}));
		exportToCSV(exportData, filename);
	}

	// Calculate totals for cards
	const totalMasuk = data.reportData.reduce((acc, curr) => acc + curr.masuk, 0);
	const totalKeluar = data.reportData.reduce((acc, curr) => acc + curr.keluar, 0);
	const totalSaldo = data.reportData.reduce((acc, curr) => acc + curr.akhir, 0);
</script>

<svelte:head>
	<title>Laporan Mutasi - PLN Gudang</title>
</svelte:head>

<div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
	<div>
		<h1 class="text-3xl font-bold text-[#0A417A]">Laporan Mutasi</h1>
		<p class="text-gray-500 mt-2">Rekapitulasi mutasi material (Awal, Masuk, Keluar, Akhir)</p>
	</div>

	<div class="flex items-center gap-3">
		<button 
			onclick={handleDownload}
			class="bg-[#FFD500] hover:bg-[#FFAB00] text-[#0A417A] text-sm font-bold py-[9px] px-5 rounded-lg flex items-center shadow-md transition-all h-full"
		>
			<svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
			Download Excel (CSV)
		</button>
	</div>
</div>

<!-- Filters Panel -->
<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
	<form method="GET" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-sm">
		<div>
			<label for="startDate" class="block text-xs font-bold text-gray-500 uppercase mb-1">Mulai Tanggal</label>
			<input type="date" name="startDate" value={data.startDate} class="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm" />
		</div>
		<div>
			<label for="endDate" class="block text-xs font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
			<input type="date" name="endDate" value={data.endDate} class="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm" />
		</div>
		{#if data.userRole === 'ADMIN_UP3'}
			<div>
				<label for="ulpId" class="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Unit</label>
				<select name="ulpId" class="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 bg-white">
					<option value="up3" selected={data.selectedUlpId === 'up3'}>Gudang Pusat UP3</option>
					{#each data.allUlps as ulp}
						<option value={ulp.id} selected={data.selectedUlpId === ulp.id.toString()}>Gudang ULP {ulp.name}</option>
					{/each}
				</select>
			</div>
		{/if}
		<div>
			<button type="submit" class="w-full bg-[#0A417A] text-white font-bold py-2 rounded-lg hover:bg-[#0D5BB4] transition-all shadow-md">
				Tampilkan Laporan
			</button>
		</div>
	</form>
</div>

<!-- KPI Cards -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
	<div class="bg-gradient-to-br from-white to-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
		<p class="text-xs font-black text-green-600 uppercase tracking-widest mb-1">Total Masuk (Item)</p>
		<p class="text-3xl font-black text-[#0A417A]">{totalMasuk.toLocaleString('id-ID')}</p>
	</div>
	<div class="bg-gradient-to-br from-white to-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
		<p class="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Total Keluar (Item)</p>
		<p class="text-3xl font-black text-[#0A417A]">{totalKeluar.toLocaleString('id-ID')}</p>
	</div>
	<div class="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
		<p class="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Total Saldo Akhir</p>
		<p class="text-3xl font-black text-[#0A417A]">{totalSaldo.toLocaleString('id-ID')}</p>
	</div>
</div>

<!-- Main Table -->
<div class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-gray-50 text-gray-600 text-sm border-b border-gray-200 uppercase tracking-wider">
					<th class="px-6 py-4 font-semibold w-16 text-center italic text-xs">#</th>
					<th class="px-6 py-4 font-semibold">Material</th>
					<th class="px-6 py-4 font-semibold text-center">Satuan</th>
					<th class="px-6 py-4 font-semibold text-center bg-gray-100/50">Stok Awal</th>
					<th class="px-6 py-4 font-semibold text-center text-green-600">Masuk (+)</th>
					<th class="px-6 py-4 font-semibold text-center text-red-600">Keluar (-)</th>
					<th class="px-6 py-4 font-semibold text-center bg-blue-50 text-[#0A417A]">Stok Akhir</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#if data.reportData.length === 0}
					<tr>
						<td colspan="7" class="px-6 py-10 text-center text-gray-500 bg-gray-50/50">Tidak ada data transaksi material di periode ini.</td>
					</tr>
				{:else}
					{#each data.reportData as item, i}
						<tr class="hover:bg-gray-50/80 transition-colors duration-150 text-sm italic">
							<td class="px-6 py-4 text-center text-gray-400 font-medium italic">{i + 1}</td>
							<td class="px-6 py-4">
								<div class="font-bold text-[#0A417A] text-sm italic not-italic font-bold">{item.name}</div>
							</td>
							<td class="px-6 py-4 text-center">
								<span class="text-gray-500 font-medium">{item.unit}</span>
							</td>
							<td class="px-6 py-4 text-center font-medium bg-gray-100/20 text-gray-400">
								{item.awal.toLocaleString('id-ID')}
							</td>
							<td class="px-6 py-4 text-center font-bold text-green-600">
								{item.masuk > 0 ? '+' : ''}{item.masuk.toLocaleString('id-ID')}
							</td>
							<td class="px-6 py-4 text-center font-bold text-red-600">
								{item.keluar > 0 ? '-' : ''}{item.keluar.toLocaleString('id-ID')}
							</td>
							<td class="px-6 py-4 text-center font-black bg-blue-50/30 text-[#0188CE] text-base">
								{item.akhir.toLocaleString('id-ID')}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<div class="mt-6 text-xs text-gray-400 italic">
	* Stok Awal dihitung berdasarkan data transaksi sebelum tanggal {data.startDate}.
</div>
