<script lang="ts">
	import { enhance } from '$app/forms';
	
	let { data, form } = $props();

	let isModalOpen = $state(false);
	let jenisInput = $state('EXISTING'); // 'EXISTING' | 'BARU'

	let editData = $state<{id: number, name: string, unit: string} | null>(null);

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
				<select name="ulpId" id="ulpId" onchange={(e) => e.currentTarget.form?.submit()} class="border border-gray-300 rounded-lg px-3 py-[9px] text-sm focus:ring-cyan-500 outline-none bg-white cursor-pointer hover:bg-gray-50 shadow-sm">
					<option value="up3" selected={data.selectedUlpId === 'up3'}>Gudang Pusat UP3</option>
					{#each data.allUlps as ulp}
						<option value={ulp.id} selected={data.selectedUlpId === ulp.id.toString()}>Gudang ULP {ulp.name}</option>
					{/each}
				</select>
			</form>
		{/if}

		{#if data.userRole === 'ADMIN_UP3' && (data.selectedUlpId === 'up3' || !data.selectedUlpId)}
			<!-- New Button now properly triggers the modal -->
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
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-gray-50 text-gray-600 text-sm border-b border-gray-200 uppercase tracking-wider">
					<th class="px-6 py-4 font-semibold w-16 text-center">ID</th>
					<th class="px-6 py-4 font-semibold">Nama Material</th>
					<th class="px-6 py-4 font-semibold">Satuan</th>
					<th class="px-6 py-4 font-semibold text-center">Stok Gudang ({data.ulpName})</th>
					{#if data.userRole === 'ADMIN_UP3'}
						<th class="px-6 py-4 font-semibold text-right">Aksi</th>
					{/if}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#if data.materials.length === 0}
					<tr>
						<td colspan="5" class="px-6 py-10 text-center text-gray-500 bg-gray-50/50">Belum ada material yang terdaftar.</td>
					</tr>
				{:else}
					{#each data.materials as material, i}
						<tr class="hover:bg-gray-50/80 transition-colors duration-150">
							<td class="px-6 py-4 text-center text-gray-400 font-medium">{material.id}</td>
							<td class="px-6 py-4">
								<div class="font-bold text-[#0A417A] text-base">{material.name}</div>
							</td>
							<td class="px-6 py-4">
								<span class="text-gray-600 font-medium">
									{material.unit}
								</span>
							</td>
							<td class="px-6 py-4 text-center font-bold {(material.stockQuantity || 0) < 100 ? 'text-red-500' : 'text-green-600'}">
								{material.stockQuantity || 0}
							</td>
							{#if data.userRole === 'ADMIN_UP3'}
								<td class="px-6 py-4 text-right flex justify-end items-center gap-3">
									<button onclick={() => editData = {id: material.id, name: material.name, unit: material.unit}} class="text-[#0188CE] hover:text-[#0A417A] font-medium text-sm transition-colors">Edit</button>
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

<!-- MODAL INPUT MATERIAL DATANG (KHUSUS UP3) -->
{#if isModalOpen}
	<!-- Modal Background -->
	<div class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
		<!-- Modal Content -->
		<div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-200">
			<div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
				<h3 class="font-bold text-lg text-[#0A417A] flex items-center">
					<svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
					Penerimaan Logistik UP3
				</h3>
				<button onclick={() => isModalOpen = false} class="text-gray-400 hover:text-gray-600 font-bold p-1">&times;</button>
			</div>
			
			<div class="p-6">
				<form method="POST" action="?/tambah" use:enhance class="space-y-4">
					
					<!-- Tab Toggles -->
					<div class="flex space-x-6 mb-2 border-b border-gray-200">
						<button type="button" class="pb-2 font-bold text-sm outline-none transition-colors {jenisInput === 'EXISTING' ? 'text-[#0188CE] border-b-2 border-[#0188CE]' : 'text-gray-400 hover:text-gray-600'}" onclick={() => jenisInput = 'EXISTING'}>+ Tambah Stok Tersedia</button>
						<button type="button" class="pb-2 font-bold text-sm outline-none transition-colors {jenisInput === 'BARU' ? 'text-[#0188CE] border-b-2 border-[#0188CE]' : 'text-gray-400 hover:text-gray-600'}" onclick={() => jenisInput = 'BARU'}>Katalog Material Baru</button>
					</div>

					<input type="hidden" name="jenisInput" value={jenisInput} />

					<!-- Form Fields based on Type -->
					{#if jenisInput === 'EXISTING'}
						<div class="pt-2">
							<label class="block text-sm font-semibold text-gray-700 mb-1">Pilih Material Yang Datang</label>
							<select name="materialId" required class="block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE] bg-white">
								<option value="">Pilih...</option>
								{#each data.materials as mat}
									<option value={mat.id}>{mat.name} ({mat.unit})</option>
								{/each}
							</select>
						</div>
					{:else}
						<div class="pt-2 space-y-3">
							<div>
								<label class="block text-sm font-semibold text-gray-700 mb-1">Nama Material Baru</label>
								<input type="text" name="nama" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" placeholder="Contoh: Kabel TIC 2x10" />
							</div>
							<div class="w-full">
								<label class="block text-sm font-semibold text-gray-700 mb-1">Satuan</label>
								<input type="text" name="satuan" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" placeholder="Contoh: MTR" />
							</div>
						</div>
					{/if}

					<!-- Common Field -->
					<div class="pt-2 border-t border-gray-100 mt-4">
						<label class="block text-sm font-bold text-[#0A417A] mb-1">Total Unit Masuk (Fisik)</label>
						<input type="number" min="1" name="jumlah" required class="block w-full border border-cyan-300 bg-cyan-50 rounded-lg px-3 py-3 text-lg font-bold text-center outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" placeholder="0" />
					</div>

					<div class="pt-6 flex justify-end">
						<button type="button" onclick={() => isModalOpen = false} class="mr-3 px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
						<button type="submit" class="px-6 py-2.5 bg-[#FFD500] hover:bg-[#FFAB00] text-[#0A417A] text-sm font-bold rounded-lg shadow-md transition-colors flex items-center">
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
							Proses Penerimaan
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL EDIT MATERIAL (KHUSUS UP3) -->
{#if editData}
	<div class="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col border border-gray-200">
			<div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
				<h3 class="font-bold text-lg text-[#0A417A]">Edit Material</h3>
				<button onclick={() => editData = null} class="text-gray-400 hover:text-gray-600 font-bold p-1">&times;</button>
			</div>
			
			<div class="p-6">
				<form method="POST" action="?/edit" use:enhance class="space-y-4">
					<input type="hidden" name="materialId" value={editData.id} />
					
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-1">Nama Material</label>
						<input type="text" name="nama" required bind:value={editData.name} class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" />
					</div>
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-1">Satuan</label>
						<input type="text" name="satuan" required bind:value={editData.unit} class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]" />
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
