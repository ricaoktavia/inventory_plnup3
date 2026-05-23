<script lang="ts">
	import XLSX from 'xlsx-js-style';
	
	let { data } = $props();
	let activeTab = $state(data.activeTab || 'MUTASI'); // MUTASI | PEMAKAIAN

	function switchTab(tab: string) {
		activeTab = tab;
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', tab);
			window.history.replaceState({}, '', url.toString());
		}
	}

	function handleDownload() {
		if (activeTab === 'MUTASI') {
			const filename = `Laporan_Mutasi_${data.selectedUlpId}_${data.startDate}_sd_${data.endDate}.xlsx`;
			const excelRows: any[][] = [];

			// Header Row
			excelRows.push([
				'No',
				'Material',
				'Satuan',
				'Stok Awal',
				'Masuk (+)',
				'Keluar (-)',
				'Stok Akhir'
			]);

			data.reportData.forEach((item, i) => {
				excelRows.push([
					i + 1,
					item.name,
					item.unit,
					item.awal,
					item.masuk,
					item.keluar,
					item.akhir
				]);
			});

			// Create workbook & worksheet
			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.aoa_to_sheet(excelRows);

			// Dynamic column widths calculation (prevent overlapping/text clipping)
			const colWidths = excelRows[0].map((_, colIndex) => {
				let maxLen = 10; // minimum fallback width
				excelRows.forEach(row => {
					const val = row[colIndex];
					const len = val ? String(val).length : 0;
					if (len > maxLen) {
						maxLen = len;
					}
				});
				return { wch: Math.min(maxLen + 4, 50) };
			});
			ws['!cols'] = colWidths;

			const colCount = excelRows[0].length;

			// Header Styling (Background Green `#107C41`, Text White, Bold)
			const headerStyle = {
				fill: {
					patternType: 'solid',
					fgColor: { rgb: '107C41' }
				},
				font: {
					bold: true,
					color: { rgb: 'FFFFFF' },
					name: 'Calibri',
					sz: 11
				},
				alignment: {
					horizontal: 'center',
					vertical: 'center',
					wrapText: true
				},
				border: {
					top: { style: 'thin', color: { rgb: 'CCCCCC' } },
					bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
					left: { style: 'thin', color: { rgb: 'CCCCCC' } },
					right: { style: 'thin', color: { rgb: 'CCCCCC' } }
				}
			};

			// Apply Header style
			for (let c = 0; c < colCount; c++) {
				const cellRef = XLSX.utils.encode_cell({ r: 0, c: c });
				if (ws[cellRef]) {
					ws[cellRef].s = headerStyle;
				}
			}

			// Apply Data cells style (Calibri 10, thin gray border)
			const totalRows = excelRows.length;
			for (let r = 1; r < totalRows; r++) {
				for (let c = 0; c < colCount; c++) {
					const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
					if (ws[cellRef]) {
						const isNumeric = typeof excelRows[r][c] === 'number';
						ws[cellRef].s = {
							font: {
								name: 'Calibri',
								sz: 10
							},
							alignment: {
								horizontal: isNumeric ? 'right' : (c === 0 || c === 2 ? 'center' : 'left'),
								vertical: 'center'
							},
							border: {
								top: { style: 'thin', color: { rgb: 'E5E7EB' } },
								bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
								left: { style: 'thin', color: { rgb: 'E5E7EB' } },
								right: { style: 'thin', color: { rgb: 'E5E7EB' } }
							}
						};
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, ws, 'Laporan Mutasi');
			XLSX.writeFile(wb, filename);
		} else {
			// Download Monthly Usage Trend
			const filename = `Tren_Pemakaian_${data.selectedUlpId}_Tahun_${data.currentYear}.xlsx`;
			const excelRows: any[][] = [];

			// Header Row
			excelRows.push([
				'No',
				'Material',
				'Satuan',
				'Jan',
				'Feb',
				'Mar',
				'Apr',
				'Mei',
				'Jun',
				'Jul',
				'Agt',
				'Sep',
				'Okt',
				'Nov',
				'Des',
				'Total',
				'Rata-rata/Bulan'
			]);

			data.monthlyUsageData.forEach((item, i) => {
				excelRows.push([
					i + 1,
					item.name,
					item.unit,
					...item.months,
					item.total,
					item.avg
				]);
			});

			// Create workbook & worksheet
			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.aoa_to_sheet(excelRows);

			// Dynamic column widths calculation (prevent overlapping/text clipping)
			const colWidths = excelRows[0].map((_, colIndex) => {
				let maxLen = 6; // lower min fallback for month columns
				excelRows.forEach(row => {
					const val = row[colIndex];
					const len = val ? String(val).length : 0;
					if (len > maxLen) {
						maxLen = len;
					}
				});
				return { wch: Math.min(maxLen + 4, 50) };
			});
			ws['!cols'] = colWidths;

			const colCount = excelRows[0].length;

			// Header Styling (Background Green `#107C41`, Text White, Bold)
			const headerStyle = {
				fill: {
					patternType: 'solid',
					fgColor: { rgb: '107C41' }
				},
				font: {
					bold: true,
					color: { rgb: 'FFFFFF' },
					name: 'Calibri',
					sz: 11
				},
				alignment: {
					horizontal: 'center',
					vertical: 'center',
					wrapText: true
				},
				border: {
					top: { style: 'thin', color: { rgb: 'CCCCCC' } },
					bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
					left: { style: 'thin', color: { rgb: 'CCCCCC' } },
					right: { style: 'thin', color: { rgb: 'CCCCCC' } }
				}
			};

			// Apply Header style
			for (let c = 0; c < colCount; c++) {
				const cellRef = XLSX.utils.encode_cell({ r: 0, c: c });
				if (ws[cellRef]) {
					ws[cellRef].s = headerStyle;
				}
			}

			// Apply Data cells style (Calibri 10, thin gray border)
			const totalRows = excelRows.length;
			for (let r = 1; r < totalRows; r++) {
				for (let c = 0; c < colCount; c++) {
					const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
					if (ws[cellRef]) {
						const isNumeric = typeof excelRows[r][c] === 'number';
						ws[cellRef].s = {
							font: {
								name: 'Calibri',
								sz: 10
							},
							alignment: {
								horizontal: isNumeric ? 'right' : (c === 0 || c === 2 ? 'center' : 'left'),
								vertical: 'center'
							},
							border: {
								top: { style: 'thin', color: { rgb: 'E5E7EB' } },
								bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
								left: { style: 'thin', color: { rgb: 'E5E7EB' } },
								right: { style: 'thin', color: { rgb: 'E5E7EB' } }
							}
						};
					}
				}
			}

			XLSX.utils.book_append_sheet(wb, ws, 'Tren Pemakaian');
			XLSX.writeFile(wb, filename);
		}
	}
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
			class="bg-gradient-to-r from-[#107C41] to-[#1B5E20] hover:from-[#1B5E20] hover:to-[#0D522C] text-white text-sm font-bold py-[9px] px-5 rounded-lg flex items-center shadow-md transition-all h-full cursor-pointer"
		>
			<svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
			Download Excel
		</button>
	</div>
</div>

<!-- Filters Panel -->
<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
	<form method="GET" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-sm">
		<input type="hidden" name="tab" value={activeTab} />
		
		{#if activeTab === 'MUTASI'}
			<div>
				<label for="startDate" class="block text-xs font-bold text-gray-500 uppercase mb-1">Mulai Tanggal</label>
				<input 
					type="date" 
					name="startDate" 
					value={data.startDate} 
					onchange={(e) => e.currentTarget.form?.submit()}
					class="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm" 
				/>
			</div>
			<div>
				<label for="endDate" class="block text-xs font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
				<input 
					type="date" 
					name="endDate" 
					value={data.endDate} 
					onchange={(e) => e.currentTarget.form?.submit()}
					class="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm" 
				/>
			</div>
		{:else}
			<div>
				<label for="year" class="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Tahun</label>
				<select 
					name="year" 
					onchange={(e) => e.currentTarget.form?.submit()}
					class="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 bg-white cursor-pointer hover:border-gray-400 transition-all font-semibold"
				>
					{#each data.yearsList as y}
						<option value={y} selected={data.currentYear === y}>{y}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if data.userRole === 'ADMIN_UP3'}
			<div>
				<label for="ulpId" class="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Unit</label>
				<select 
					name="ulpId" 
					onchange={(e) => e.currentTarget.form?.submit()}
					class="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 bg-white cursor-pointer hover:border-gray-400 transition-all font-semibold"
				>
					<option value="up3" selected={data.selectedUlpId === 'up3'}>Gudang Pusat UP3</option>
					{#each data.allUlps as ulp}
						<option value={ulp.id} selected={data.selectedUlpId === ulp.id.toString()}>Gudang ULP {ulp.name}</option>
					{/each}
				</select>
			</div>
		{/if}
	</form>
</div>

<!-- Tabs Header -->
<div class="flex border-b border-gray-200 mb-6 gap-2">
	<button 
		type="button"
		onclick={() => switchTab('MUTASI')} 
		class="px-5 py-2.5 font-bold text-sm transition-all border-b-2 {activeTab === 'MUTASI' ? 'border-[#0A417A] text-[#0A417A]' : 'border-transparent text-gray-500 hover:text-gray-700'} cursor-pointer"
	>
		📋 Rekap Mutasi Stok
	</button>
	<button 
		type="button"
		onclick={() => switchTab('PEMAKAIAN')} 
		class="px-5 py-2.5 font-bold text-sm transition-all border-b-2 {activeTab === 'PEMAKAIAN' ? 'border-[#0A417A] text-[#0A417A]' : 'border-transparent text-gray-500 hover:text-gray-700'} cursor-pointer"
	>
		📈 Analisis Pemakaian Bulanan ({data.currentYear})
	</button>
</div>

{#if activeTab === 'MUTASI'}
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
									<div class="font-bold text-[#0A417A] text-sm not-italic font-bold">{item.name}</div>
								</td>
								<td class="px-6 py-4 text-center font-medium text-gray-500">
									<span>{item.unit}</span>
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
{:else}
	<!-- Monthly Usage Trend Table -->
	<div class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-gray-50 text-gray-600 text-xs border-b border-gray-200 uppercase tracking-wider">
						<th class="px-4 py-4 font-semibold w-12 text-center italic">#</th>
						<th class="px-4 py-4 font-semibold">Material</th>
						<th class="px-4 py-4 font-semibold text-center">Satuan</th>
						<th class="px-2 py-4 font-semibold text-center">Jan</th>
						<th class="px-2 py-4 font-semibold text-center">Feb</th>
						<th class="px-2 py-4 font-semibold text-center">Mar</th>
						<th class="px-2 py-4 font-semibold text-center">Apr</th>
						<th class="px-2 py-4 font-semibold text-center">Mei</th>
						<th class="px-2 py-4 font-semibold text-center">Jun</th>
						<th class="px-2 py-4 font-semibold text-center">Jul</th>
						<th class="px-2 py-4 font-semibold text-center">Agt</th>
						<th class="px-2 py-4 font-semibold text-center">Sep</th>
						<th class="px-2 py-4 font-semibold text-center">Okt</th>
						<th class="px-2 py-4 font-semibold text-center">Nov</th>
						<th class="px-2 py-4 font-semibold text-center">Des</th>
						<th class="px-4 py-4 font-semibold text-center bg-gray-100/50">Total</th>
						<th class="px-4 py-4 font-semibold text-center bg-green-50 text-green-700">Rata-rata</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#if data.monthlyUsageData.length === 0}
						<tr>
							<td colspan="17" class="px-6 py-10 text-center text-gray-500 bg-gray-50/50">Tidak ada data pemakaian lapangan di tahun ini.</td>
						</tr>
					{:else}
						{#each data.monthlyUsageData as item, i}
							<tr class="hover:bg-gray-50/80 transition-colors duration-150 text-sm italic">
								<td class="px-4 py-3.5 text-center text-gray-400 font-medium italic">{i + 1}</td>
								<td class="px-4 py-3.5">
									<div class="font-bold text-[#0A417A] text-sm not-italic">{item.name}</div>
								</td>
								<td class="px-4 py-3.5 text-center">
									<span class="text-gray-500 font-medium not-italic text-xs">{item.unit}</span>
								</td>
								{#each item.months as monthVal}
									<td class="px-2 py-3.5 text-center font-medium not-italic text-xs {monthVal > 0 ? 'text-gray-900 font-bold' : 'text-gray-300'}">
										{monthVal > 0 ? monthVal.toLocaleString('id-ID') : '-'}
									</td>
								{/each}
								<td class="px-4 py-3.5 text-center font-bold bg-gray-100/10 text-gray-700 not-italic">
									{item.total.toLocaleString('id-ID')}
								</td>
								<td class="px-4 py-3.5 text-center font-black bg-green-50/30 text-green-700 not-italic text-sm">
									{item.avg.toLocaleString('id-ID')}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="mt-6 text-xs text-gray-400 italic">
		* Rata-rata/Bulan dihitung berdasarkan total pemakaian tahun {data.currentYear} dibagi 12 bulan.
	</div>
{/if}
