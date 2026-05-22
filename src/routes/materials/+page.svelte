<script lang="ts">
	import { enhance } from '$app/forms';
	
	let { data, form } = $props();

	let isModalOpen = $state(false);
	let editData = $state<{id: number, name: string, unit: string, currentStock: number} | null>(null);

	// Close modal on successful form submission
	$effect(() => {
		if (form?.success) {
			isModalOpen = false;
			editData = null;
		}
	});

</script>

<svelte:head>
	<title>Inventory & Material - PLN Gudang</title>
</svelte:head>

<div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
	<div>
		<h1 class="text-3xl font-bold text-[#0A417A]">Master Data Material</h1>
		<p class="text-gray-500 mt-2">Daftar stok material yang tersedia di sistem PLN Gudang</p>
	</div>
	
	<div class="flex items-end space-x-3 w-full md:w-auto">
		{#if data.userRole === 'ADMIN_UP3'}
			<!-- Dropdown Filter ULP -->
			<form method="GET" class="flex flex-col flex-1 md:flex-initial">
				<label for="ulpId" class="text-xs text-gray-500 mb-1 font-semibold">Lihat Stok Lokasi:</label>
				<div class="flex gap-2">
					<select name="ulpId" id="ulpId" onchange={(e) => e.currentTarget.form?.submit()} class="border border-gray-300 rounded-lg px-3 py-[9px] text-sm focus:ring-cyan-500 outline-none bg-white cursor-pointer hover:bg-gray-50 shadow-sm font-bold text-[#0A417A]">
						<option value="rekap" selected={data.selectedUlpId === 'rekap'}>📊 Rekap Seluruh Unit (Konsolidasi)</option>
						<option value="up3" selected={data.selectedUlpId === 'up3'}>🏠 Gudang Pusat UP3</option>
						<optgroup label="Daftar Gudang ULP">
							{#each data.allUlps as ulp}
								<option value={ulp.id} selected={data.selectedUlpId === ulp.id.toString()}>Gudang ULP {ulp.name}</option>
							{/each}
						</optgroup>
					</select>
				</div>
			</form>
		{/if}

		{#if data.userRole === 'ADMIN_UP3' && data.selectedUlpId !== 'rekap'}
			<!-- New Button now properly triggers the modal - Only for Admin UP3 when a specific unit is selected -->
			<button onclick={() => isModalOpen = true} class="bg-[#0A417A] hover:bg-[#0D5BB4] text-white text-sm font-bold py-[9px] px-5 rounded-lg flex items-center shadow-md transition-all h-full mt-auto shrink-0 border border-transparent">
				<svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
				Baru
			</button>
		{/if}
	</div>
</div>

{#if form?.success}
	<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium">✅ {form.message}</div>
{/if}
{#if form?.error}
	<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium">⚠️ {form.error}</div>
{/if}

<div class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col">
	<div class="overflow-x-auto">
		<table class="w-full text-left border-collapse min-w-[800px]">
			<thead>
				<tr class="bg-gray-50 text-gray-600 text-[10px] border-b border-gray-200 uppercase tracking-wider">
					<th class="px-4 py-4 font-black w-12 text-center sticky left-0 bg-gray-50 z-10 border-r border-gray-100">No.</th>
					<th class="px-4 py-4 font-black sticky left-12 bg-gray-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-gray-100">Nama Material</th>
					<th class="px-4 py-4 font-black text-center">Unit</th>
					
					{#if data.selectedUlpId === 'rekap'}
						<th class="px-4 py-4 font-black text-center bg-blue-50/50 text-[#0A417A]">Pusat</th>
						{#each data.allUlps as ulp}
							<th class="px-4 py-4 font-black text-center">{ulp.name}</th>
						{/each}
						<th class="px-4 py-4 font-black text-center bg-yellow-50 text-yellow-800">Total</th>
					{:else if data.selectedUlpId === 'up3'}
						<th class="px-6 py-4 font-semibold text-center text-[#0A417A] bg-blue-50/30">Stok {data.ulpName}</th>
					{:else}
						<th class="px-4 py-4 font-black text-center bg-blue-50 text-[#0A417A] border-r border-blue-100">
							<div class="flex flex-col items-center gap-0.5">
								<span>Stok Gudang Pusat</span>
								<span class="text-[8px] font-bold text-blue-400 uppercase tracking-widest">(UP3)</span>
							</div>
						</th>
						<th class="px-4 py-4 font-black text-center bg-green-50 text-green-700">
							<div class="flex flex-col items-center gap-0.5">
								<span>Stok Gudang ULP</span>
								<span class="text-[8px] font-bold text-green-400 uppercase tracking-widest">(Milik Sendiri)</span>
							</div>
						</th>
					{/if}

					{#if data.userRole === 'ADMIN_UP3' && data.selectedUlpId !== 'rekap'}
						<th class="px-6 py-4 font-semibold text-right">Aksi</th>
					{/if}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#if data.materials.length === 0}
					<tr>
						<td colspan="20" class="px-6 py-10 text-center text-gray-500 bg-gray-50/50">Belum ada material yang terdaftar.</td>
					</tr>
				{:else}
					{#each data.materials as material, i}
						<tr class="hover:bg-gray-50/80 transition-colors duration-150 text-xs">
							<td class="px-4 py-4 text-center text-gray-400 font-medium sticky left-0 bg-white border-r border-gray-50">{i + 1}</td>
							<td class="px-4 py-4 sticky left-12 bg-white z-0 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-gray-50">
								<div class="font-bold text-[#0A417A] uppercase whitespace-normal break-words">{material.name}</div>
							</td>
							<td class="px-4 py-4 text-center font-medium text-gray-500">{material.unit}</td>

							{#if data.selectedUlpId === 'rekap'}
								<!-- PUSAT column -->
								<td class="px-4 py-4 text-center font-black bg-blue-50/20 text-[#0A417A]">
									{data.stockMatrix[material.id]['up3'] || 0}
								</td>
								<!-- ULP columns -->
								{#each data.allUlps as ulp}
									<td class="px-4 py-4 text-center font-medium {data.stockMatrix[material.id][ulp.id] > 0 ? 'text-gray-900' : 'text-gray-300'}">
										{data.stockMatrix[material.id][ulp.id] || 0}
									</td>
								{/each}
								<!-- TOTAL column -->
								<td class="px-4 py-4 text-center font-black bg-yellow-50 text-yellow-700">
									{Object.values(data.stockMatrix[material.id]).reduce((a, b) => a + b, 0)}
								</td>
							{:else if data.selectedUlpId === 'up3'}
								<!-- UP3 own stock view -->
								{@const qty = data.stockMatrix[material.id]['up3'] || 0}
								<td class="px-6 py-4 text-center font-black text-lg {qty < 50 ? 'text-red-500' : 'text-green-600'}">
									{qty}
								</td>
							{:else}
								<!-- ULP view: show both UP3 stock AND ULP's own stock -->
								{@const up3qty = data.stockMatrix[material.id]['up3'] || 0}
								{@const ulpqty = data.stockMatrix[material.id][data.selectedUlpId] || 0}
								<td class="px-4 py-4 text-center font-black text-base bg-blue-50/30 border-r border-blue-50 {up3qty <= 0 ? 'text-red-500' : 'text-gray-900'}">
									{up3qty}
								</td>
								<td class="px-4 py-4 text-center font-black text-base bg-green-50/30 {ulpqty <= 0 ? 'text-red-500' : 'text-gray-900'}">
									{ulpqty}
								</td>
							{/if}

							{#if data.userRole === 'ADMIN_UP3' && data.selectedUlpId !== 'rekap'}
								<td class="px-6 py-4 text-right flex justify-end items-center gap-3">
									<button onclick={() => editData = {id: material.id, name: material.name, unit: material.unit, currentStock: data.stockMatrix[material.id][data.selectedUlpId] || 0}} class="text-[#0188CE] hover:text-[#0A417A] font-medium text-sm transition-colors">Edit</button>
									<form method="POST" action="?/hapus" use:enhance={({ cancel }) => {
										if (!confirm('Yakin ingin menghapus material ini secara permanen?')) {
											cancel();
										}
									}}>
										<input type="hidden" name="materialId" value={material.id} />
										<button type="submit" class="text-red-500 hover:text-red-700 font-medium text-sm transition-colors cursor-pointer">Hapus</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- MODAL TAMBAH MATERIAL BARU (KHUSUS UP3) -->
{#if isModalOpen}
	<!-- Modal Background -->
	<div class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
		<!-- Modal Content -->
		<div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-200">
			<div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
				<h3 class="font-bold text-lg text-[#0A417A] flex items-center">
					<svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
					Tambah Katalog Material Baru
				</h3>
				<button onclick={() => isModalOpen = false} class="text-gray-400 hover:text-gray-600 font-bold p-1">&times;</button>
			</div>
			
			<div class="p-6">
				<form method="POST" action="?/tambah" use:enhance class="space-y-4">
					<input type="hidden" name="ulpId" value={data.selectedUlpId} />

					<div class="pt-2 space-y-3">
						<div>
							<label class="block text-sm font-semibold text-gray-700 mb-1">Nama Material Baru</label>
							<input type="text" name="nama" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" placeholder="Contoh: Kabel TIC 2x10" />
						</div>
						<div class="w-full">
							<label class="block text-sm font-semibold text-gray-700 mb-1">Satuan</label>
							<input type="text" name="satuan" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" placeholder="Contoh: MTR" />
						</div>
						<div>
							<label class="block text-sm font-semibold text-gray-700 mb-1">Deskripsi (Opsional)</label>
							<textarea name="deskripsi" class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" placeholder="Keterangan material..."></textarea>
						</div>
					</div>

					<!-- Common Field -->
					<div class="pt-2 border-t border-gray-100 mt-4">
						<label class="block text-sm font-bold text-[#0A417A] mb-1">Stok Awal Fisik ({data.ulpName})</label>
						<input type="number" min="0" name="jumlah" value="0" required class="block w-full border border-cyan-300 bg-cyan-50 rounded-lg px-3 py-3 text-lg font-bold text-center outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" placeholder="0" />
					</div>

					<div class="pt-6 flex justify-end">
						<button type="button" onclick={() => isModalOpen = false} class="mr-3 px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
						<button type="submit" class="px-6 py-2.5 bg-[#FFD500] hover:bg-[#FFAB00] text-[#0A417A] text-sm font-bold rounded-lg shadow-md transition-colors flex items-center">
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
							Simpan Material
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL EDIT MATERIAL & STOK (KHUSUS UP3) -->
{#if editData}
	<div class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col border border-gray-200">
			<div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
				<h3 class="font-bold text-lg text-[#0A417A]">Edit Material & Stok</h3>
				<button onclick={() => editData = null} class="text-gray-400 hover:text-gray-600 font-bold p-1">&times;</button>
			</div>
			
			<div class="p-6">
				<form method="POST" action="?/edit" use:enhance class="space-y-4">
					<input type="hidden" name="materialId" value={editData.id} />
					<input type="hidden" name="ulpId" value={data.selectedUlpId} />
					
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-1">Nama Material</label>
						<input type="text" name="nama" required bind:value={editData.name} class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" />
					</div>
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-1">Satuan</label>
						<input type="text" name="satuan" required bind:value={editData.unit} class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" />
					</div>
					<div>
						<label class="block text-sm font-bold text-[#0A417A] mb-1">Stok Tersedia ({data.ulpName})</label>
						<input type="number" name="stok" min="0" required bind:value={editData.currentStock} class="block w-full border border-cyan-300 bg-cyan-50 rounded-lg px-3 py-2.5 text-base font-bold text-center outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" />
					</div>

					<div class="pt-4 flex justify-end">
						<button type="button" onclick={() => editData = null} class="mr-3 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg">Batal</button>
						<button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow">Simpan Perubahan</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
