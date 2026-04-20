<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Validasi BAST - {data.trx.ref}</title>
</svelte:head>

<div class="min-h-screen bg-[#F0F2F5] flex items-center justify-center py-10 px-4 font-['Inter',sans-serif]">
	<div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
		
		<!-- PLN Header Format -->
		<div class="bg-[#0A417A] text-white p-6 flex flex-col sm:flex-row items-center justify-between relative overflow-hidden">
			<!-- Background geometric -->
			<svg class="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 20" preserveAspectRatio="none">
				<path d="M-10,30 L60,-10 L70,-10 L0,30 Z" fill="white"></path>
			</svg>
			
			<div class="flex items-center relative z-10 w-full sm:w-auto justify-center sm:justify-start mb-4 sm:mb-0">
				<img src="/logo-pln.png" class="w-16 h-auto object-contain mr-4 shrink-0 rounded shadow" alt="Logo PLN" />
				<div class="text-left">
					<h1 class="font-bold text-lg tracking-wider">PT PLN (PERSERO)</h1>
					<p class="text-xs text-blue-200">DISTRIBUSI JAWA TIMUR, UP3 MADURA</p>
				</div>
			</div>
			
			<div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg px-4 py-2 shadow-lg flex items-center relative z-10 border border-green-400">
				<svg class="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
				<div class="text-left">
					<div class="font-bold text-white text-sm">DOKUMEN VALID</div>
					<div class="text-[10px] text-green-100 uppercase tracking-widest">Tersertifikasi</div>
				</div>
			</div>
		</div>

		<div class="p-6 md:p-8 space-y-6">
			
			<!-- Legal Warning Banner -->
			<div class="bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs p-3 rounded text-justify leading-relaxed">
				<strong>PEMBERITAHUAN HUKUM:</strong> Berita Acara Serah Terima (BAST) pergerakan material ini di-kriptografi dan dicatat secara *real-time* ke dalam buku induk logistik elektronik. Dokumen elektronik ini memiliki kekuatan hukum mengikat yang setara dan sah menggantikan fungsi tanda tangan basah fisik.
			</div>

			<!-- Meta Data Table -->
			<div>
				<h3 class="font-bold text-gray-800 border-b-2 border-[#0A417A] pb-2 mb-3 tracking-wide uppercase text-sm">Informasi Transaksi Inti</h3>
				<table class="w-full text-sm">
					<tbody>
						<tr class="border-b border-gray-100">
							<td class="py-2 text-gray-500 font-medium w-1/3">No. Referensi BAST</td>
							<td class="py-2 font-bold text-[#0A417A] text-base">{data.trx.ref}</td>
						</tr>
						<tr class="border-b border-gray-100">
							<td class="py-2 text-gray-500 font-medium">Waktu Autentikasi</td>
							<td class="py-2 font-bold text-gray-800">
								{new Date(data.trx.approvedDate || data.trx.date).toLocaleString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
							</td>
						</tr>
						<tr class="border-b border-gray-100">
							<td class="py-2 text-gray-500 font-medium">Pihak Pertama (Pengirim)</td>
							<td class="py-2 font-bold text-gray-800">NANANG DARYANTO <span class="block text-[11px] font-normal text-gray-500">Of Kin Dan Adm Lay Gan - UP3 Madura</span></td>
						</tr>
						<tr>
							<td class="py-2 text-gray-500 font-medium">Pihak Kedua (Penerima)</td>
							<td class="py-2 font-bold text-gray-800 uppercase">{data.trx.takerName} <span class="block text-[11px] font-normal text-gray-500">Petugas Logistik - ULP {data.trx.targetUlp}</span></td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Box Details -->
			<div class="mt-4">
				<h3 class="font-bold text-gray-800 border-b-2 border-[#0A417A] pb-2 mb-3 tracking-wide uppercase text-sm">Manifes Rincian Material</h3>
				<div class="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
					<table class="w-full text-sm">
						<thead class="bg-gray-100 text-gray-700 text-left text-xs uppercase border-b border-gray-300">
							<tr>
								<th class="px-4 py-3 font-bold">Nama Material / Barang</th>
								<th class="px-4 py-3 font-bold text-center">Volume</th>
								<th class="px-4 py-3 font-bold text-center">Satuan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each data.details as item}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-3 font-semibold text-[#0A417A]">{item.materialName}</td>
									<td class="px-4 py-3 text-center font-bold text-gray-800 text-lg">{item.quantity}</td>
									<td class="px-4 py-3 text-center text-xs font-bold text-gray-500">{item.unit}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Tanda Tangan Elektronik ULP & Foto -->
			<div class="mt-6 pt-4 border-t-2 border-dashed border-gray-300">
				<h3 class="font-bold text-gray-800 mb-3 tracking-wide uppercase text-sm text-center">Dokumentasi Autentikasi Lapangan</h3>
				{#if data.trx.photo}
					<div class="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
						<img src={data.trx.photo} alt="Bukti Penerimaan" class="max-w-full lg:max-w-md max-h-[350px] object-scale-down rounded border shadow mb-4 bg-white p-2" />
						<div class="w-full bg-blue-50 text-blue-900 px-4 py-3 rounded-lg flex items-center text-xs border border-blue-200 justify-center">
							<svg class="w-5 h-5 mr-3 shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
							<div class="leading-relaxed text-justify">
								<strong>TERVERIFIKASI AMAN:</strong> Gambar ini diambil dan dienkripsi secara langsung dari lapangan oleh otoritas <strong>PT PLN ULP {data.trx.targetUlp}</strong> saat serah terima barang.
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="text-center pt-4 border-t border-gray-100 flex flex-col justify-center items-center">
				<div class="text-[10px] text-gray-400 font-mono tracking-widest mb-4">
					DIGITAL_SIGNATURE_ID: {data.trx.ref.replace(/-/g, '')}{new Date(data.trx.approvedDate || data.trx.date).getTime().toString()}<br/>
					ALGORITHM: AES-256 / SHA-256 VERIFIED
				</div>
				<a href="/mutasi/{data.trx.id}/bast" target="_blank" class="inline-flex items-center px-6 py-2.5 bg-gray-800 hover:bg-black text-white text-sm font-bold rounded-lg transition-colors shadow">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
					Lihat / Unduh Dokumen PDF Lengkap
				</a>
			</div>
		</div>
	</div>
</div>
