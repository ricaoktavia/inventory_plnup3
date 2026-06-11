<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let isModalOpen = $state(false);
	let editData = $state<{ id: number; name: string; unit: string; currentStock: number } | null>(
		null
	);
	let searchQuery = $state('');

	// Filtered materials based on search query
	let filteredMaterials = $derived(
		searchQuery.trim() === ''
			? data.materials
			: data.materials.filter((m: { name: string }) =>
					m.name.toLowerCase().includes(searchQuery.toLowerCase())
				)
	);

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

<div class="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
	<div>
		<h1 class="text-3xl font-bold text-[#0A417A]">Master Data Material</h1>
		<p class="mt-2 text-gray-500">Daftar stok material yang tersedia di sistem PLN Gudang</p>
	</div>

	<div class="flex w-full items-end space-x-3 md:w-auto">
		{#if data.userRole === 'ADMIN_UP3'}
			<!-- Dropdown Filter ULP -->
			<form method="GET" class="flex flex-1 flex-col md:flex-initial">
				<label for="ulpId" class="mb-1 text-xs font-semibold text-gray-500"
					>Lihat Stok Lokasi:</label
				>
				<div class="flex gap-2">
					<select
						name="ulpId"
						id="ulpId"
						onchange={(e) => e.currentTarget.form?.submit()}
						class="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-[9px] text-sm font-bold text-[#0A417A] shadow-sm outline-none hover:bg-gray-50 focus:ring-cyan-500"
					>
						<option value="rekap" selected={data.selectedUlpId === 'rekap'}
							>📊 Rekap Seluruh Unit (Konsolidasi)</option
						>
						<option value="up3" selected={data.selectedUlpId === 'up3'}>🏠 Gudang Pusat UP3</option>
						<optgroup label="Daftar Gudang ULP">
							{#each data.allUlps as ulp}
								<option value={ulp.id} selected={data.selectedUlpId === ulp.id.toString()}
									>Gudang ULP {ulp.name}</option
								>
							{/each}
						</optgroup>
					</select>
				</div>
			</form>
		{/if}

		{#if data.userRole === 'ADMIN_UP3' && data.selectedUlpId !== 'rekap'}
			<!-- New Button now properly triggers the modal - Only for Admin UP3 when a specific unit is selected -->
			<button
				onclick={() => (isModalOpen = true)}
				class="mt-auto flex h-full shrink-0 items-center rounded-lg border border-transparent bg-[#0A417A] px-5 py-[9px] text-sm font-bold text-white shadow-md transition-all hover:bg-[#0D5BB4]"
			>
				<svg class="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					></path></svg
				>
				Baru
			</button>
		{/if}
	</div>
</div>

{#if form?.success}
	<div
		class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
	>
		✅ {form.message}
	</div>
{/if}
{#if form?.error}
	<div
		class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
	>
		⚠️ {form.error}
	</div>
{/if}

<!-- SEARCH BAR -->
<div class="relative mb-4">
	<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
		<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
			/>
		</svg>
	</div>
	<input
		type="text"
		id="search-material"
		bind:value={searchQuery}
		placeholder="Cari nama material..."
		class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-10 pl-11 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-[#0188CE] focus:ring-2 focus:ring-[#0188CE] focus:outline-none"
	/>
	{#if searchQuery}
		<button
			onclick={() => (searchQuery = '')}
			class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-colors hover:text-gray-600"
			aria-label="Hapus pencarian"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	{/if}
</div>

<div class="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow">
	<div class="overflow-x-auto">
		<table class="w-full min-w-[800px] border-collapse text-left">
			<thead>
				<tr
					class="border-b border-gray-200 bg-gray-50 text-[10px] tracking-wider text-gray-600 uppercase"
				>
					<th
						class="sticky left-0 z-10 w-12 border-r border-gray-100 bg-gray-50 px-4 py-4 text-center font-black"
						>No.</th
					>
					<th
						class="sticky left-12 z-10 border-r border-gray-100 bg-gray-50 px-4 py-4 font-black shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
						>Nama Material</th
					>
					<th class="px-4 py-4 text-center font-black">Unit</th>

					{#if data.selectedUlpId === 'rekap'}
						<th class="bg-blue-50/50 px-4 py-4 text-center font-black text-[#0A417A]">Pusat</th>
						{#each data.allUlps as ulp}
							<th class="px-4 py-4 text-center font-black">{ulp.name}</th>
						{/each}
						<th class="bg-yellow-50 px-4 py-4 text-center font-black text-yellow-800">Total</th>
					{:else if data.selectedUlpId === 'up3'}
						<th class="bg-blue-50/30 px-6 py-4 text-center font-semibold text-[#0A417A]"
							>Stok {data.ulpName}</th
						>
					{:else}
						<th
							class="border-r border-blue-100 bg-blue-50 px-4 py-4 text-center font-black text-[#0A417A]"
						>
							<div class="flex flex-col items-center gap-0.5">
								<span>Stok Gudang Pusat</span>
								<span class="text-[8px] font-bold tracking-widest text-blue-400 uppercase"
									>(UP3)</span
								>
							</div>
						</th>
						<th class="bg-green-50 px-4 py-4 text-center font-black text-green-700">
							<div class="flex flex-col items-center gap-0.5">
								<span>Stok Gudang ULP</span>
								<span class="text-[8px] font-bold tracking-widest text-green-400 uppercase"
									>(Milik Sendiri)</span
								>
							</div>
						</th>
					{/if}

					{#if data.userRole === 'ADMIN_UP3' && data.selectedUlpId !== 'rekap'}
						<th class="px-6 py-4 text-right font-semibold">Aksi</th>
					{/if}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#if filteredMaterials.length === 0}
					<tr>
						<td colspan="20" class="bg-gray-50/50 px-6 py-10 text-center text-gray-500">
							{searchQuery
								? `Tidak ditemukan material dengan nama "${searchQuery}".`
								: 'Belum ada material yang terdaftar.'}
						</td>
					</tr>
				{:else}
					{#each filteredMaterials as material, i}
						<tr class="text-xs transition-colors duration-150 hover:bg-gray-50/80">
							<td
								class="sticky left-0 border-r border-gray-50 bg-white px-4 py-4 text-center font-medium text-gray-400"
								>{i + 1}</td
							>
							<td
								class="sticky left-12 z-0 border-r border-gray-50 bg-white px-4 py-4 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
							>
								<div class="font-bold break-words whitespace-normal text-[#0A417A] uppercase">
									{material.name}
								</div>
							</td>
							<td class="px-4 py-4 text-center font-medium text-gray-500">{material.unit}</td>

							{#if data.selectedUlpId === 'rekap'}
								<!-- PUSAT column -->
								<td class="bg-blue-50/20 px-4 py-4 text-center font-black text-[#0A417A]">
									{data.stockMatrix[material.id]['up3'] || 0}
								</td>
								<!-- ULP columns -->
								{#each data.allUlps as ulp}
									<td
										class="px-4 py-4 text-center font-medium {data.stockMatrix[material.id][
											ulp.id
										] > 0
											? 'text-gray-900'
											: 'text-gray-300'}"
									>
										{data.stockMatrix[material.id][ulp.id] || 0}
									</td>
								{/each}
								<!-- TOTAL column -->
								<td class="bg-yellow-50 px-4 py-4 text-center font-black text-yellow-700">
									{Object.values(data.stockMatrix[material.id]).reduce((a, b) => a + b, 0)}
								</td>
							{:else if data.selectedUlpId === 'up3'}
								<!-- UP3 own stock view -->
								{@const qty = data.stockMatrix[material.id]['up3'] || 0}
								<td
									class="px-6 py-4 text-center text-lg font-black {qty < 50
										? 'text-red-500'
										: 'text-green-600'}"
								>
									{qty}
								</td>
							{:else}
								<!-- ULP view: show both UP3 stock AND ULP's own stock -->
								{@const up3qty = data.stockMatrix[material.id]['up3'] || 0}
								{@const ulpqty = data.stockMatrix[material.id][data.selectedUlpId!] || 0}
								<td
									class="border-r border-blue-50 bg-blue-50/30 px-4 py-4 text-center text-base font-black {up3qty <=
									0
										? 'text-red-500'
										: 'text-gray-900'}"
								>
									{up3qty}
								</td>
								<td
									class="bg-green-50/30 px-4 py-4 text-center text-base font-black {ulpqty <= 0
										? 'text-red-500'
										: 'text-gray-900'}"
								>
									{ulpqty}
								</td>
							{/if}

							{#if data.userRole === 'ADMIN_UP3' && data.selectedUlpId !== 'rekap'}
								<td class="flex items-center justify-end gap-3 px-6 py-4 text-right">
									<button
										onclick={() =>
											(editData = {
												id: material.id,
												name: material.name,
												unit: material.unit,
												currentStock: data.stockMatrix[material.id][data.selectedUlpId!] || 0
											})}
										class="text-sm font-medium text-[#0188CE] transition-colors hover:text-[#0A417A]"
										>Edit</button
									>
									<form
										method="POST"
										action="?/hapus"
										use:enhance={({ cancel }) => {
											if (!confirm('Yakin ingin menghapus material ini secara permanen?')) {
												cancel();
											}
										}}
									>
										<input type="hidden" name="materialId" value={material.id} />
										<button
											type="submit"
											class="cursor-pointer text-sm font-medium text-red-500 transition-colors hover:text-red-700"
											>Hapus</button
										>
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
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
	>
		<!-- Modal Content -->
		<div
			class="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			<div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
				<h3 class="flex items-center text-lg font-bold text-[#0A417A]">
					<svg
						class="mr-2 h-5 w-5 text-yellow-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
						></path></svg
					>
					Tambah Katalog Material Baru
				</h3>
				<button
					onclick={() => (isModalOpen = false)}
					class="p-1 font-bold text-gray-400 hover:text-gray-600">&times;</button
				>
			</div>

			<div class="p-6">
				<form method="POST" action="?/tambah" use:enhance class="space-y-4">
					<input type="hidden" name="ulpId" value={data.selectedUlpId} />

					<div class="space-y-3 pt-2">
						<div>
							<label class="mb-1 block text-sm font-semibold text-gray-700"
								>Nama Material Baru</label
							>
							<input
								type="text"
								name="nama"
								required
								class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]"
								placeholder="Contoh: Kabel TIC 2x10"
							/>
						</div>
						<div class="w-full">
							<label class="mb-1 block text-sm font-semibold text-gray-700">Satuan</label>
							<input
								type="text"
								name="satuan"
								required
								class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]"
								placeholder="Contoh: MTR"
							/>
						</div>
						<div>
							<label class="mb-1 block text-sm font-semibold text-gray-700"
								>Deskripsi (Opsional)</label
							>
							<textarea
								name="deskripsi"
								class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]"
								placeholder="Keterangan material..."
							></textarea>
						</div>
					</div>

					<!-- Common Field -->
					<div class="mt-4 border-t border-gray-100 pt-2">
						<label class="mb-1 block text-sm font-bold text-[#0A417A]"
							>Stok Awal Fisik ({data.ulpName})</label
						>
						<input
							type="number"
							min="0"
							name="jumlah"
							value="0"
							required
							class="block w-full rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-3 text-center text-lg font-bold outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]"
							placeholder="0"
						/>
					</div>

					<div class="flex justify-end pt-6">
						<button
							type="button"
							onclick={() => (isModalOpen = false)}
							class="mr-3 rounded-lg px-5 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
							>Batal</button
						>
						<button
							type="submit"
							class="flex items-center rounded-lg bg-[#FFD500] px-6 py-2.5 text-sm font-bold text-[#0A417A] shadow-md transition-colors hover:bg-[#FFAB00]"
						>
							<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								></path></svg
							>
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
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
	>
		<div
			class="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			<div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5">
				<h3 class="text-lg font-bold text-[#0A417A]">Edit Material & Stok</h3>
				<button
					onclick={() => (editData = null)}
					class="p-1 font-bold text-gray-400 hover:text-gray-600">&times;</button
				>
			</div>

			<div class="p-6">
				<form method="POST" action="?/edit" use:enhance class="space-y-4">
					<input type="hidden" name="materialId" value={editData.id} />
					<input type="hidden" name="ulpId" value={data.selectedUlpId} />

					<div>
						<label class="mb-1 block text-sm font-semibold text-gray-700">Nama Material</label>
						<input
							type="text"
							name="nama"
							required
							bind:value={editData.name}
							class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-semibold text-gray-700">Satuan</label>
						<input
							type="text"
							name="satuan"
							required
							bind:value={editData.unit}
							class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-bold text-[#0A417A]"
							>Stok Tersedia ({data.ulpName})</label
						>
						<input
							type="number"
							name="stok"
							min="0"
							required
							bind:value={editData.currentStock}
							class="block w-full rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2.5 text-center text-base font-bold outline-none focus:border-[#0188CE] focus:ring-1 focus:ring-[#0188CE]"
						/>
					</div>

					<div class="flex justify-end pt-4">
						<button
							type="button"
							onclick={() => (editData = null)}
							class="mr-3 rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
							>Batal</button
						>
						<button
							type="submit"
							class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
							>Simpan Perubahan</button
						>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
