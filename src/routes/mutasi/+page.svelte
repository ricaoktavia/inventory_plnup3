<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let fileBase64 = $state('');

	async function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				fileBase64 = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	// Dynamic Materials Array State
	let materialRows = $state([{ materialId: '', jumlah: '', keterangan: '' }]);

	function addMaterialRow() {
		materialRows = [...materialRows, { materialId: '', jumlah: '', keterangan: '' }];
	}

	function removeMaterialRow(index: number) {
		materialRows = materialRows.filter((_, i) => i !== index);
	}

	// Tabs for ULP
	let ulpActiveTab = $state('VERIFIKASI'); // VERIFIKASI | PEMAKAIAN

	// Selected Draft State
	let selectedDraftId = $state('');
	let selectedDraftData = $derived((data.pendingDrafts || []).find((d: any) => d.id.toString() === selectedDraftId) || null);

	// History Filters
	let historyFilter = $state('ALL'); // ALL | DISTRIBUTION | USAGE
	let filteredHistory = $derived(
		historyFilter === 'ALL' 
			? (data.history || []) 
			: (data.history || []).filter((t: any) => t.type === historyFilter)
	);

</script>

<svelte:head>
	<title>Transaksi Material - PLN Gudang</title>
</svelte:head>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-[1200px] mx-auto min-h-[calc(100vh-140px)]">
	
	<!-- LEFT PANEL: Dynamic Form -->
	<div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">
		<div class="bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4] p-4 flex items-center text-white shrink-0 relative overflow-hidden">
			<svg class="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 20">
				<path d="M-10,30 L60,-10 L70,-10 L0,30 Z" fill="rgba(255,255,255,0.2)"></path>
			</svg>
			<img src="/logo-icon.png" class="h-12 w-auto object-contain shrink-0 mr-3 relative z-10 drop-shadow-md" alt="Logo PLN"/>
			<div class="font-bold text-lg leading-tight flex-1 flex justify-between items-center relative z-10">
				<div>PLN <span class="font-normal text-sm opacity-90 ml-1">Transaksi Material</span></div>
			</div>
		</div>

		<div class="p-10 flex-1 flex flex-col">
			{#if form?.success}
				<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium">✅ {form.message}</div>
			{/if}
			{#if form?.error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium">⚠️ {form.error}</div>
			{/if}

			{#if data.userRole === 'ADMIN_UP3'}
				<!-- TAHAP 1: FORM DRAFT OLEH UP3 MENGGUNAKAN MULTI-ITEM -->
				<h2 class="text-xl font-bold text-[#0A417A] mb-8 border-b border-gray-100 pb-2">Form Distribusi (Ke ULP)</h2>

				<form method="POST" action="?/draft" use:enhance class="space-y-6 flex-1 flex flex-col">
					<!-- Pihak ULP Tujuan -->
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label for="ulpId" class="block text-sm font-semibold text-[#0A417A]">Pilih ULP Tujuan</label>
							<select id="ulpId" name="ulpId" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-cyan-500">
								<option value="">Pilih ULP...</option>
								{#each data.ulps as ulp}
									<option value={ulp.id}>{ulp.name}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-1.5">
							<label for="takerName" class="block text-sm font-semibold text-[#0A417A]">Nama Pengambil</label>
							<input type="text" id="takerName" name="takerName" placeholder="Contoh: Budi Santoso" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-cyan-500">
						</div>
					</div>

					<!-- Rincian Material Dynamic -->
					<div class="border border-gray-200 p-4 rounded-lg bg-gray-50/50">
						<div class="flex justify-between items-center mb-4">
							<label class="block text-sm font-semibold text-[#0A417A]">Rincian Material</label>
							<button type="button" onclick={addMaterialRow} class="text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 px-2.5 py-1 rounded">
								+ Tambah Baris
							</button>
						</div>
						
						<div class="space-y-4">
							{#each materialRows as row, i}
								<div class="p-3 border border-gray-200 rounded-lg bg-white space-y-2 relative shadow-sm">
									{#if materialRows.length > 1}
										<button type="button" onclick={() => removeMaterialRow(i)} class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full shadow hover:bg-red-600 transition-colors z-20">
											<span class="text-[10px]">✕</span>
										</button>
									{/if}
									
									<div class="space-y-1">
										<label class="text-[10px] font-bold text-gray-400 uppercase">Nama Material</label>
										<select name="materialId[]" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500 bg-gray-50">
											<option value="">Pilih Material...</option>
											{#each data.materials as mat}
												<option value={mat.id}>{mat.name} ({mat.unit})</option>
											{/each}
										</select>
									</div>

									<div class="flex gap-3">
										<div class="w-1/4 space-y-1">
											<label class="text-[10px] font-bold text-gray-400 uppercase">Jumlah</label>
											<input type="number" name="jumlah[]" placeholder="0" required class="block w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-700 outline-none text-center focus:border-cyan-500">
										</div>
										<div class="flex-1 space-y-1">
											<label class="text-[10px] font-bold text-gray-400 uppercase">Keterangan Kondisi</label>
											<input type="text" name="keterangan[]" placeholder="Contoh: Baik / Sisa" class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-cyan-500">
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<div class="flex-1 mt-4"></div>
					<button type="submit" class="w-full bg-[#FFD500] hover:bg-[#FFAB00] text-[#0A417A] font-bold text-lg py-3 rounded-lg shadow-md mt-auto">
						Buat Draf Mutasi
					</button>
				</form>

			{:else}
				<!-- TABS BAGI ULP -->
				<div class="flex border-b border-gray-200 mb-6">
					<button class="px-4 py-2 text-sm font-bold {ulpActiveTab === 'VERIFIKASI' ? 'text-[#0A417A] border-b-2 border-[#0A417A]' : 'text-gray-400 hover:text-gray-600'}" onclick={() => ulpActiveTab = 'VERIFIKASI'}>
						Verifikasi Penerimaan
					</button>
					<button class="px-4 py-2 text-sm font-bold ml-2 {ulpActiveTab === 'PEMAKAIAN' ? 'text-[#0A417A] border-b-2 border-[#0A417A]' : 'text-gray-400 hover:text-gray-600'}" onclick={() => ulpActiveTab = 'PEMAKAIAN'}>
						Pemakaian Lapangan
					</button>
				</div>

				{#if ulpActiveTab === 'VERIFIKASI'}
					<!-- TAHAP 2: VERIFIKASI DRAFT UP3 -->
					<form method="POST" action="?/verifikasi" use:enhance class="space-y-5 flex-1 flex flex-col">
						<div class="space-y-1.5">
							<label for="transactionId" class="block text-sm font-semibold text-[#0A417A]">Pilih Transaksi Draf</label>
							<select id="transactionId" name="transactionId" required bind:value={selectedDraftId} class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 outline-none focus:border-cyan-500 bg-white" disabled={(data.pendingDrafts || []).length === 0}>
								<option value="">{(data.pendingDrafts || []).length === 0 ? 'Tidak ada Draf untuk saat ini...' : 'Pilih Dokumen Draf...'}</option>
								{#each (data.pendingDrafts || []) as draft}
									<option value={draft.id}>{draft.ref} (Pengambil: {draft.takerName})</option>
								{/each}
							</select>
						</div>

						{#if selectedDraftData}
							<!-- Rincian Dinamis Tampil di Sini -->
							<div class="bg-blue-50 border border-blue-200 rounded p-4">
								<h4 class="text-xs font-bold text-blue-800 mb-2 uppercase">Detail Barang yang harus diterima:</h4>
								<ul class="text-sm space-y-1 text-gray-700">
									{#each selectedDraftData.items as item}
										<li class="flex justify-between border-b border-blue-100 pb-1">
											<span>• {item.name}</span>
											<span class="font-bold">{item.quantity} <span class="text-xs font-normal text-gray-500">{item.unit}</span></span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<div class="space-y-1.5 border border-dashed border-cyan-300 bg-cyan-50 p-4 rounded-lg text-center mt-2 {(data.pendingDrafts || []).length === 0 ? 'opacity-50 pointer-events-none' : ''}">
							<label class="block text-sm font-bold text-cyan-800 mb-2">Ambil Foto Barcode/Barang di Lapangan</label>
							<label class="cursor-pointer bg-white text-gray-700 px-4 py-2 rounded-md font-medium border border-gray-300 shadow-sm inline-flex items-center hover:bg-gray-50">
								<svg class="w-5 h-5 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
								Buka Kamera
								<input type="file" id="file" accept="image/*" capture="environment" class="hidden" onchange={handleFileChange} />
							</label>
							{#if fileBase64}
								<div class="text-green-600 text-sm font-bold mt-3">✓ Bukti Siap Diunggah</div>
							{/if}
							<input type="hidden" name="fileBase64" value={fileBase64}>
						</div>

						<div class="flex-1 mt-6"></div>
						<button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-lg py-3 rounded-lg shadow-md mt-auto disable-when-empty" disabled={(data.pendingDrafts || []).length === 0 || !selectedDraftId || !fileBase64} style={(data.pendingDrafts || []).length === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}>
							Konfirmasi Terima Fisik
						</button>
					</form>
				{:else if ulpActiveTab === 'PEMAKAIAN'}
					<!-- MODUL BARU: PEMAKAIAN LAPANGAN -->
					<form method="POST" action="?/penggunaan" use:enhance class="space-y-5 flex-1 flex flex-col">
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label for="tanggal" class="block text-sm font-semibold text-[#0A417A]">Tanggal Transaksi</label>
								<input type="date" id="tanggal" name="tanggal" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none">
							</div>
							<div class="space-y-1.5">
								<label for="takerNamePemakaian" class="block text-sm font-semibold text-[#0A417A]">Nama Petugas Lapangan</label>
								<input type="text" id="takerNamePemakaian" name="takerName" placeholder="Contoh: Tim Har" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none">
							</div>
						</div>

						<div class="space-y-1.5">
							<label for="usagePurpose" class="block text-sm font-semibold text-[#0A417A]">Tujuan / No. SPK</label>
							<input type="text" id="usagePurpose" name="usagePurpose" placeholder="Contoh: SPK Ganti Tiang No 123" required class="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none">
						</div>

						<!-- Multi item Pemakaian -->
						<div class="border border-gray-200 p-4 rounded-lg bg-gray-50/50">
							<div class="flex justify-between items-center mb-4">
								<label class="block text-sm font-semibold text-[#0A417A]">Rincian Pemakaian</label>
								<button type="button" onclick={addMaterialRow} class="text-xs font-bold text-[#0A417A] bg-yellow-400 hover:bg-yellow-500 px-2.5 py-1 rounded shadow-sm">
									+ Tambah
								</button>
							</div>
							
							<div class="space-y-3">
								{#each materialRows as row, i}
								<div class="p-3 border border-gray-200 rounded-lg bg-white space-y-2 relative">
									{#if materialRows.length > 1}
										<button type="button" onclick={() => removeMaterialRow(i)} class="absolute -top-2 -right-2 bg-red-400 text-white w-4 h-4 flex items-center justify-center rounded-full shadow-sm hover:bg-red-500 text-[10px]">
											✕
										</button>
									{/if}

									<div class="space-y-1">
										<label class="text-[9px] font-bold text-gray-400 uppercase">Material</label>
										<select name="materialId[]" required class="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 outline-none bg-gray-50">
											<option value="">Pilih Material...</option>
											{#each data.materials as mat}
												<option value={mat.id}>{mat.name} ({mat.unit})</option>
											{/each}
										</select>
									</div>

									<div class="flex gap-2">
										<div class="w-20 space-y-1">
											<label class="text-[9px] font-bold text-gray-400 uppercase">Jml</label>
											<input type="number" name="jumlah[]" placeholder="0" required class="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-center outline-none">
										</div>
										<div class="flex-1 space-y-1">
											<label class="text-[9px] font-bold text-gray-400 uppercase">Keterangan</label>
											<input type="text" name="keterangan[]" placeholder="Kondisi barang..." class="block w-full border border-gray-300 rounded px-2 py-1.5 text-xs outline-none">
										</div>
									</div>
								</div>
								{/each}
							</div>
							<p class="text-[10px] text-gray-400 italic mt-3">*Stok cabang ULP akan langsung didebet ketika dikonfirmasi.</p>
						</div>

						<div class="flex-1 mt-2"></div>
						<button type="submit" class="w-full bg-[#FFD500] hover:bg-[#FFAB00] text-[#0A417A] font-bold text-lg py-3 rounded-lg shadow-md mt-auto border-t">
							Catat Pemakaian
						</button>
					</form>
				{/if}
			{/if}
		</div>
	</div>

	<!-- RIGHT PANEL: Riwayat Transaksi -->
	<div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
		<div class="bg-gradient-to-r from-[#0188CE] via-[#0092D1] to-[#0D5BB4] p-4 flex items-center justify-between text-white shrink-0 relative overflow-hidden">
			<svg class="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 20">
				<path d="M20,40 L90,-10 L100,-10 L30,40 Z" fill="rgba(255,255,255,0.2)"></path>
			</svg>
			<div class="flex items-center relative z-10">
				<img src="/logo-icon.png" class="h-12 w-auto object-contain shrink-0 mr-3 drop-shadow-md" alt="Logo PLN"/>
				<div class="font-bold text-lg tracking-wide">PLN Histori Transaksi</div>
			</div>
		</div>

		{#if data.userRole !== 'ADMIN_UP3'}
			<div class="px-8 pt-6 pb-2 shrink-0">
				<div class="flex bg-gray-100 p-1 rounded-lg">
					<button class="flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all {historyFilter === 'ALL' ? 'bg-white text-[#0A417A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => historyFilter = 'ALL'}>
						SEMUA
					</button>
					<button class="flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all {historyFilter === 'DISTRIBUTION' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => historyFilter = 'DISTRIBUTION'}>
						DISTRIBUSI
					</button>
					<button class="flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all {historyFilter === 'USAGE' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" onclick={() => historyFilter = 'USAGE'}>
						PEMAKAIAN
					</button>
				</div>
			</div>
		{/if}

		<div class="p-8 pt-4 flex-1 flex flex-col pt-0">
			<div class="overflow-y-auto max-h-[700px] pr-2">
				{#if filteredHistory.length === 0}
					<div class="py-12 text-center text-gray-400">
						<svg class="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
						<p class="text-sm">Tidak ada riwayat untuk filter ini.</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each filteredHistory as trx}
							<div class="border border-gray-200 rounded-lg p-4 {trx.type === 'USAGE' ? 'bg-orange-50/30' : 'bg-white'} hover:shadow-md transition-shadow relative">
								<!-- Badge Type -->
								<div class="absolute top-4 right-4">
									{#if trx.type === 'USAGE'}
										<span class="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded">PEMAKAIAN</span>
									{:else}
										<span class="bg-blue-100 text-[#0A417A] text-[10px] font-bold px-2 py-0.5 rounded">DISTRIBUSI</span>
									{/if}
								</div>

								<div class="flex items-center space-x-2 text-xs text-gray-500 font-semibold mb-2">
									<span>{new Date(trx.date).toLocaleDateString('id-ID')}</span>
									<span>•</span>
									<span class="text-[#0A417A]">{trx.referenceNumber}</span>
								</div>

								<div class="mb-3">
									{#if trx.type === 'USAGE'}
										<p class="text-sm font-bold text-gray-800">SPK: {trx.usagePurpose}</p>
										<p class="text-xs text-gray-600">Oleh: {trx.takerName} (ULP {trx.targetUlp})</p>
									{:else}
										<p class="text-sm font-bold text-gray-800">Ke: ULP {trx.targetUlp}</p>
										<p class="text-xs text-gray-600">Pengambil: {trx.takerName}</p>
									{/if}
								</div>

								<div class="bg-gray-50 rounded p-2 mb-3">
									{#each trx.items as item}
										<div class="py-1 border-b border-gray-100 last:border-0">
											<div class="flex justify-between text-xs">
												<span class="text-gray-600 font-medium">{item.name}</span>
												<span class="font-bold">{item.quantity}</span>
											</div>
											{#if item.description}
												<p class="text-[10px] text-gray-400 italic mt-0.5">• {item.description}</p>
											{/if}
										</div>
									{/each}
								</div>

								<!-- Status & Actions -->
								<div class="flex items-center justify-between border-t border-gray-100 pt-3">
									<div>
										{#if trx.status === 'DRAFT'}
											<span class="text-xs text-gray-500 font-bold">● DRAFT</span>
										{:else if trx.status === 'APPROVED_ULP'}
											<span class="text-xs text-blue-600 font-bold">● VERIFIED</span>
										{:else}
											<span class="text-xs text-green-600 font-bold">● SELESAI</span>
										{/if}
									</div>

									<div>
										<!-- Action Buttons based on Role -->
										{#if trx.type === 'DISTRIBUTION'}
											{#if trx.status === 'APPROVED_ULP' && data.userRole === 'ADMIN_UP3'}
												<form method="POST" action="?/finalisasi" use:enhance>
													<input type="hidden" name="transactionId" value={trx.id} />
													<button class="bg-yellow-400 hover:bg-yellow-500 text-[#0A417A] px-3 py-1 rounded text-xs font-bold transition-colors">
														Pindah Stok Gudang
													</button>
												</form>
											{:else if trx.status === 'COMPLETED'}
												<a href="/mutasi/{trx.id}/bast" target="_blank" class="text-xs bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded font-semibold transition-colors">
													📄 Cetak BAST
												</a>
											{/if}
										{:else if trx.type === 'USAGE'}
											<span class="text-xs italic text-gray-400">Log Lapangan</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
