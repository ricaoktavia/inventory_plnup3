<script lang="ts">
	import XLSX from 'xlsx-js-style';
	import { loadingState } from '$lib/loadingState.svelte';

	let { data } = $props();

	// Default Dates: First day of current month to Today
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const formatDate = (date: Date) => date.toISOString().split('T')[0];

	let startDate = $state(formatDate(firstDayOfMonth));
	let endDate = $state(formatDate(now));
	let selectedType = $state('ALL'); // ALL | USAGE_ULP | USAGE_UP3 | TRANSFER | INITIAL_STOCK

	// Helper for label display
	function getTransactionTypeLabel(type: string, targetUlpId: number | null, ulpName: string) {
		if (type === 'INITIAL_STOCK') {
			if (!targetUlpId) return 'Stok Awal UP3';
			return 'Stok Awal ULP';
		}
		if (type === 'DISTRIBUTION') return 'Transfer Material';
		if (type === 'USAGE') {
			if (!targetUlpId || ulpName === 'Pusat UP3') {
				return 'Pemakaian UP3';
			}
			return 'Pemakaian ULP';
		}
		return type;
	}

	// Filter history list based on filters
	let filteredHistory = $derived(
		(data.usageHistory || []).filter((item: any) => {
			// Date filter
			const itemDate = new Date(item.date);
			const start = startDate ? new Date(startDate + 'T00:00:00') : null;
			const end = endDate ? new Date(endDate + 'T23:59:59') : null;

			if (start && itemDate < start) return false;
			if (end && itemDate > end) return false;

			// Type filter
			if (selectedType === 'ALL') return true;
			if (selectedType === 'USAGE_UP3') {
				return item.type === 'USAGE' && (!item.targetUlpId || item.ulpName === 'Pusat UP3');
			}
			if (selectedType === 'USAGE_ULP') {
				return item.type === 'USAGE' && item.targetUlpId && item.ulpName !== 'Pusat UP3';
			}
			if (selectedType === 'TRANSFER') {
				return item.type === 'DISTRIBUTION';
			}
			if (selectedType === 'INITIAL_STOCK') {
				return item.type === 'INITIAL_STOCK';
			}
			if (selectedType === 'INITIAL_STOCK_UP3') {
				return item.type === 'INITIAL_STOCK' && !item.targetUlpId;
			}
			if (selectedType === 'INITIAL_STOCK_ULP') {
				return item.type === 'INITIAL_STOCK' && !!item.targetUlpId;
			}

			return true;
		})
	);

	function handleExport() {
		if (filteredHistory.length === 0) {
			alert('⚠️ Tidak ada data transaksi yang ditemukan pada rentang tanggal & tipe tersebut!');
			return;
		}

		loadingState.start('Mengekspor Data Excel...', 3000);

		// Wrap in a short timeout to let the loading screen render first
		setTimeout(() => {
			try {
				// Prepare excel rows
				const excelRows: any[][] = [];

				// Header Row
				excelRows.push([
					'No',
					'Tanggal Transaksi',
					'No BAST / Referensi',
					'Tipe Transaksi',
					'Unit ULP / Gudang',
					'Pihak Pertama (Pengirim)',
					'Pihak Kedua (Penerima/Taker)',
					'Keperluan / Tujuan',
					'Nama Material',
					'Jumlah',
					'Satuan',
					'Keterangan Barang'
				]);

				let idx = 1;
				filteredHistory.forEach((item: any) => {
					const formattedDate = new Date(item.date)
						.toLocaleString('id-ID', {
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
							hour: '2-digit',
							minute: '2-digit'
						})
						.replace(/\./g, ':');

					const trxType = getTransactionTypeLabel(item.type, item.targetUlpId, item.ulpName);
					const firstParty = item.firstParty || (item.type === 'INITIAL_STOCK' ? 'ULP' : 'UP3');
					const secondParty = item.takerName || '-';

					if (item.items && item.items.length > 0) {
						item.items.forEach((subItem: any) => {
							excelRows.push([
								idx++,
								formattedDate,
								item.referenceNumber,
								trxType,
								item.ulpName,
								firstParty,
								secondParty,
								item.purpose || '-',
								subItem.name,
								subItem.quantity,
								subItem.unit,
								subItem.description || '-'
							]);
						});
					} else {
						excelRows.push([
							idx++,
							formattedDate,
							item.referenceNumber,
							trxType,
							item.ulpName,
							firstParty,
							secondParty,
							item.purpose || '-',
							'-',
							0,
							'-',
							'-'
						]);
					}
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
					return { wch: Math.min(maxLen + 4, 50) }; // cap width at 50 for readability
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

				// Apply Data cells style (Calibri 10, thin gray border, align helper)
				const totalRows = excelRows.length;
				for (let r = 1; r < totalRows; r++) {
					for (let c = 0; c < colCount; c++) {
						const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
						if (ws[cellRef]) {
							ws[cellRef].s = {
								font: {
									name: 'Calibri',
									sz: 10
								},
								alignment: {
									horizontal: (c === 7 || c === 8 || c === 11) ? 'left' : 'center',
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

				// Save Worksheet to Workbook
				XLSX.utils.book_append_sheet(wb, ws, 'Data Transaksi');

				// File Name Configuration
				const typeStr = selectedType.toLowerCase().replace(/_/g, '-');
				const filename = `Export_Laporan_${typeStr}_${startDate}_sd_${endDate}.xlsx`;
				XLSX.writeFile(wb, filename);
			} catch (err) {
				console.error('Export failed:', err);
			} finally {
				loadingState.stop();
			}
		}, 100);
	}
</script>

<svelte:head>
	<title>Export Data - PLN Gudang UP3 Madura</title>
</svelte:head>

<div class="mb-8 flex justify-between items-end max-w-[1000px] mx-auto">
	<div>
		<h1 class="text-3xl font-bold text-[#0A417A]">
			Export Data Transaksi
		</h1>
		<p class="text-gray-500 mt-2">Unduh seluruh berkas riwayat mutasi ke format Microsoft Excel (.xlsx)</p>
	</div>
</div>

<div class="max-w-[600px] mx-auto">
	
	<!-- FORM FILTERS -->
	<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
		<h2 class="text-base font-bold text-[#0A417A] uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#0092D1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
			Konfigurasi Ekspor
		</h2>

		<div class="space-y-4">
			<!-- Transaksi Type Selection -->
			<div>
				<label for="type" class="block text-xs font-bold text-gray-500 uppercase mb-2">Tipe Riwayat Transaksi</label>
				<select 
					id="type"
					bind:value={selectedType}
					class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0092D1] outline-none bg-white cursor-pointer hover:border-gray-400 transition-all font-semibold text-gray-800"
				>
					<option value="ALL">Semua Riwayat Transaksi</option>
					<option value="TRANSFER">Transfer Material (Mutasi UP3 &rarr; ULP)</option>
					{#if data.userRole === 'ADMIN_UP3'}
						<option value="USAGE_UP3">Pemakaian UP3 (Gudang Pusat &rarr; Lapangan)</option>
					{/if}
					<option value="USAGE_ULP">Pemakaian ULP (Gudang ULP &rarr; Lapangan)</option>
					{#if data.userRole === 'ADMIN_UP3'}
						<option value="INITIAL_STOCK_UP3">Stok Awal Gudang Pusat (UP3)</option>
					{/if}
					<option value="INITIAL_STOCK_ULP">Stok Awal Gudang ULP</option>
				</select>
			</div>

			<!-- Date Range Picker -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="startDate" class="block text-xs font-bold text-gray-500 uppercase mb-2">Mulai Tanggal</label>
					<input 
						id="startDate"
						type="date" 
						bind:value={startDate} 
						class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0092D1] outline-none hover:border-gray-400 transition-all font-semibold text-gray-800 shadow-sm"
					/>
				</div>
				<div>
					<label for="endDate" class="block text-xs font-bold text-gray-500 uppercase mb-2">Sampai Tanggal</label>
					<input 
						id="endDate"
						type="date" 
						bind:value={endDate} 
						class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0092D1] outline-none hover:border-gray-400 transition-all font-semibold text-gray-800 shadow-sm"
					/>
				</div>
			</div>
		</div>

		<!-- Action Export Button -->
		<div class="pt-4">
			<button 
				onclick={handleExport}
				class="w-full bg-gradient-to-r from-[#0188CE] to-[#0D5BB4] hover:from-[#0092D1] hover:to-[#0A417A] text-white font-black text-sm py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 transform active:scale-95 cursor-pointer"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
				UNDUH DATA EXCEL
			</button>
		</div>
	</div>

</div>
