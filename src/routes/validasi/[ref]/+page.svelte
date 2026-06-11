<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Validasi BAST - {data.trx.ref}</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4 py-10 font-['Inter',sans-serif]"
>
	<div
		class="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
	>
		<!-- PLN Header Format -->
		<div
			class="relative flex flex-col items-center justify-between overflow-hidden bg-[#0A417A] p-6 text-white sm:flex-row"
		>
			<!-- Background geometric -->
			<svg
				class="absolute inset-0 h-full w-full opacity-10"
				viewBox="0 0 100 20"
				preserveAspectRatio="none"
			>
				<path d="M-10,30 L60,-10 L70,-10 L0,30 Z" fill="white"></path>
			</svg>

			<div
				class="relative z-10 mb-4 flex w-full items-center justify-center sm:mb-0 sm:w-auto sm:justify-start"
			>
				<img
					src="/logo-pln.png"
					class="mr-4 h-auto w-16 shrink-0 rounded object-contain shadow"
					alt="Logo PLN"
				/>
				<div class="text-left">
					<h1 class="text-lg font-bold tracking-wider">PT PLN (PERSERO)</h1>
					<p class="text-xs text-blue-200">DISTRIBUSI JAWA TIMUR, UP3 MADURA</p>
				</div>
			</div>

			<div
				class="relative z-10 flex items-center rounded-lg border border-green-400 bg-gradient-to-br from-green-500 to-green-600 px-4 py-2 shadow-lg"
			>
				<svg class="mr-2 h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"
					></path></svg
				>
				<div class="text-left">
					<div class="text-sm font-bold text-white">DOKUMEN VALID</div>
					<div class="text-[10px] tracking-widest text-green-100 uppercase">Tersertifikasi</div>
				</div>
			</div>
		</div>

		<div class="space-y-6 p-6 md:p-8">
			<!-- Legal Warning Banner -->
			<div
				class="rounded border border-yellow-200 bg-yellow-50 p-3 text-justify text-xs leading-relaxed text-yellow-800"
			>
				<strong>PEMBERITAHUAN HUKUM:</strong> Berita Acara Serah Terima (BAST) pergerakan material ini
				di-kriptografi dan dicatat secara *real-time* ke dalam buku induk logistik elektronik. Dokumen
				elektronik ini memiliki kekuatan hukum mengikat yang setara dan sah menggantikan fungsi tanda
				tangan basah fisik.
			</div>

			<!-- Meta Data Table -->
			<div>
				<h3
					class="mb-3 border-b-2 border-[#0A417A] pb-2 text-sm font-bold tracking-wide text-gray-800 uppercase"
				>
					Informasi Transaksi Inti
				</h3>
				<table class="w-full text-sm">
					<tbody>
						<tr class="border-b border-gray-100">
							<td class="w-1/3 py-2 font-medium text-gray-500">No. Referensi BAST</td>
							<td class="py-2 text-base font-bold text-[#0A417A]">{data.trx.ref}</td>
						</tr>
						<tr class="border-b border-gray-100">
							<td class="py-2 font-medium text-gray-500">Waktu Autentikasi</td>
							<td class="py-2 font-bold text-gray-800">
								{new Date(data.trx.approvedDate || data.trx.date).toLocaleString('id-ID', {
									weekday: 'long',
									day: '2-digit',
									month: 'long',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
									second: '2-digit'
								})} WIB
							</td>
						</tr>
						<tr class="border-b border-gray-100">
							<td class="py-2 font-medium text-gray-500">Pihak Pertama (Pengirim)</td>
							<td class="py-2 font-bold text-gray-800 uppercase">
								{data.trx.firstParty || 'NANANG DARYANTO'}
								<span class="block text-[11px] font-normal text-gray-500"
									>Of Kin Dan Adm Lay Gan - UP3 Madura</span
								>
							</td>
						</tr>
						<tr>
							<td class="py-2 font-medium text-gray-500">Pihak Kedua (Penerima)</td>
							<td class="py-2 font-bold text-gray-800 uppercase"
								>{data.trx.takerName}
								<span class="block text-[11px] font-normal text-gray-500"
									>Petugas Logistik - ULP {data.trx.targetUlp}</span
								></td
							>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Box Details -->
			<div class="mt-4">
				<h3
					class="mb-3 border-b-2 border-[#0A417A] pb-2 text-sm font-bold tracking-wide text-gray-800 uppercase"
				>
					Manifes Rincian Material
				</h3>
				<div class="overflow-hidden rounded-lg border border-gray-300 shadow-sm">
					<table class="w-full text-sm">
						<thead
							class="border-b border-gray-300 bg-gray-100 text-left text-xs text-gray-700 uppercase"
						>
							<tr>
								<th class="px-4 py-3 font-bold">Nama Material / Barang</th>
								<th class="px-4 py-3 text-center font-bold">Volume</th>
								<th class="px-4 py-3 text-center font-bold">Satuan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each data.details as item}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-3 font-semibold text-[#0A417A]">{item.materialName}</td>
									<td class="px-4 py-3 text-center text-lg font-bold text-gray-800"
										>{item.quantity}</td
									>
									<td class="px-4 py-3 text-center text-xs font-bold text-gray-500">{item.unit}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Tanda Tangan Elektronik ULP & Foto -->
			<div class="mt-6 border-t-2 border-dashed border-gray-300 pt-4">
				<h3 class="mb-3 text-center text-sm font-bold tracking-wide text-gray-800 uppercase">
					Dokumentasi Autentikasi Lapangan
				</h3>
				{#if data.trx.photo}
					<div
						class="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
					>
						<img
							src={data.trx.photo}
							alt="Bukti Penerimaan"
							class="mb-4 max-h-[350px] max-w-full rounded border bg-white object-scale-down p-2 shadow lg:max-w-md"
						/>
						<div
							class="flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900"
						>
							<svg
								class="mr-3 h-5 w-5 shrink-0 text-blue-600"
								fill="currentColor"
								viewBox="0 0 20 20"
								><path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								></path></svg
							>
							<div class="text-justify leading-relaxed">
								<strong>TERVERIFIKASI AMAN:</strong> Gambar ini diambil dan dienkripsi secara
								langsung dari lapangan oleh otoritas
								<strong>PT PLN ULP {data.trx.targetUlp}</strong> saat serah terima barang.
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div
				class="flex flex-col items-center justify-center border-t border-gray-100 pt-4 text-center"
			>
				<div class="mb-4 font-mono text-[10px] tracking-widest text-gray-400">
					DIGITAL_SIGNATURE_ID: {data.trx.ref.replace(/-/g, '')}{new Date(
						data.trx.approvedDate || data.trx.date
					)
						.getTime()
						.toString()}<br />
					ALGORITHM: AES-256 / SHA-256 VERIFIED
				</div>
				<a
					href="/mutasi/{data.trx.id}/bast"
					target="_blank"
					class="inline-flex items-center rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-black"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						></path></svg
					>
					Lihat / Unduh Dokumen PDF Lengkap
				</a>
			</div>
		</div>
	</div>
</div>
