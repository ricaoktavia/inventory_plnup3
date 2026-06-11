<script lang="ts">
	let { data } = $props();

	function printDoc() {
		window.print();
	}

	// Format Date into Indonesian parts
	const dateObj = new Date(data.trx.approvedDate || Date.now());
	const hari = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dateObj).toUpperCase();
	const tanggal = dateObj.getDate();
	const bulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(dateObj).toUpperCase();
	const tahun = dateObj.getFullYear();
	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.close();
			// Fallback if browser blocks window.close()
			setTimeout(() => {
				if (document.referrer) {
					window.location.href = document.referrer;
				} else {
					window.location.href = '/usage-tracker';
				}
			}, 150);
		}
	}
</script>

<svelte:head>
	<title>BAST Mutasi - {data.trx.ref}</title>
	<style>
		/* Force A4 paper size when printing */
		@page {
			size: A4 portrait;
			margin: 0;
		}

		@media print {
			/* Hide toolbar */
			.no-print {
				display: none !important;
			}

			/* Remove background gray from page wrapper */
			.bast-page-bg {
				background: white !important;
				padding: 0 !important;
				min-height: unset !important;
			}

			/* Each print-container = exactly one A4 page */
			.print-container {
				box-shadow: none !important;
				width: 210mm !important;
				max-width: 210mm !important;
				margin: 0 auto !important;
				min-height: unset !important;
				/* Keep padding so content has margins */
				padding: 15mm 20mm !important;
			}

			/* Photo page has its own padding */
			.print-container.foto-page {
				padding: 15mm 20mm !important;
			}

			.page-break {
				page-break-before: always;
			}

			/* Keep signature block together — never split across pages */
			.ttd-block {
				page-break-inside: avoid !important;
				break-inside: avoid !important;
			}

			body {
				background-color: white !important;
			}
			* {
				-webkit-print-color-adjust: exact !important;
				color-adjust: exact !important;
			}
		}

		.doc-font {
			font-family: Arial, Helvetica, sans-serif;
			font-size: 13px;
			color: black;
		}

		/* Screen-only padding for preview look */
		@media screen {
			.print-container {
				padding: 15mm 20mm;
			}
		}
	</style>
</svelte:head>

<div id="bast-print-root" class="bast-page-bg min-h-screen bg-gray-200 pb-10">
	<div
		class="no-print sticky top-0 z-50 mb-10 flex w-full justify-center bg-white/90 p-4 shadow-md backdrop-blur"
	>
		<button
			onclick={printDoc}
			class="flex items-center rounded-lg bg-cyan-600 px-6 py-2 font-bold text-white shadow-lg hover:bg-cyan-700"
		>
			<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
				></path></svg
			>
			Cetak ke PDF / Print
		</button>
		<button
			onclick={goBack}
			class="ml-4 flex cursor-pointer items-center rounded-lg border border-cyan-300 px-6 py-2 font-bold text-cyan-700 hover:bg-cyan-50"
		>
			Kembali
		</button>
	</div>

	<!-- KERTAS HALAMAN 1: BAST -->
	<div
		class="print-container doc-font relative mx-auto max-w-[210mm] bg-white text-black shadow-2xl"
	>
		<!-- Header / Kop -->
		<div class="mb-6 flex items-start">
			<!-- Logo Petir PLN Asli -->
			<img src="/logo-pln.png" class="mt-1 mr-4 h-auto w-12 object-contain" alt="Logo PLN" />
			<div class="text-[14px] leading-snug font-bold tracking-wide text-gray-800">
				<div>PT PLN (PERSERO)</div>
				<div>DISTRIBUSI JAWA TIMUR</div>
				<div>UP3 - MADURA</div>
			</div>
		</div>

		<hr class="mb-1 border-t-2 border-black" />
		<hr class="mb-8 border-t-[1px] border-black" />

		<!-- Judul -->
		<div class="mb-8 text-center">
			<h2
				class="inline-block border-b-[2px] border-black pb-0.5 text-[17px] font-bold tracking-wide"
				style="border-bottom-style: double;"
			>
				BERITA ACARA SERAH TERIMA
			</h2>
		</div>

		<!-- Konten Paragraf 1 -->
		<div class="mb-6 leading-relaxed">
			Pada hari <strong>{hari}</strong> Tanggal <strong>{tanggal}</strong> Bulan
			<strong>{bulan}</strong>
			Tahun <strong>{tahun}</strong>, yang bertanda tangan dibawah ini :
		</div>

		<!-- Pihak 1 -->
		<div class="mb-4 pl-10 leading-relaxed">
			<table class="w-full">
				<tbody>
					<tr
						><td class="w-24">Nama</td><td class="w-4 text-center">:</td><td class="uppercase">
							{data.trx.firstParty || 'NANANG DARYANTO'}
						</td></tr
					>
					<tr
						><td>Jabatan</td><td class="text-center">:</td><td class="uppercase"
							>OF KIN DAN ADM LAY GAN</td
						></tr
					>
					<tr><td>Unit</td><td class="text-center">:</td><td class="uppercase">UP3 MADURA</td></tr>
				</tbody>
			</table>
		</div>
		<div class="mb-6 leading-relaxed">
			Selanjutnya disebut sebagai <strong>Pihak Pertama</strong>
		</div>

		<!-- Pihak 2 -->
		<div class="mb-4 pl-10 leading-relaxed">
			<table class="w-full">
				<tbody>
					<tr
						><td class="w-24">Nama</td><td class="w-4 text-center">:</td><td class="uppercase"
							>{data.trx.takerName || '................'}</td
						></tr
					>
					<tr
						><td>Jabatan</td><td class="text-center">:</td><td class="uppercase"
							>TEKNISI / PETUGAS GUDANG</td
						></tr
					>
					<tr
						><td>Unit</td><td class="text-center">:</td><td class="uppercase"
							>ULP {data.trx.targetUlp || '................'}</td
						></tr
					>
				</tbody>
			</table>
		</div>
		<div class="mb-6 leading-relaxed">
			Selanjutnya disebut sebagai <strong>Pihak Kedua</strong>
		</div>

		<!-- Kalimat Peralihan -->
		<div class="mb-4 leading-relaxed">
			<strong>Pihak Pertama</strong> telah menyerahkan barang kepada <strong>Pihak Kedua</strong> dengan
			rincian sebagai berikut :
		</div>

		<!-- Tabel Material -->
		<table class="mb-8 w-full border-collapse border border-gray-500 text-[12px]">
			<thead>
				<tr class="bg-gray-50">
					<th class="w-10 border border-gray-500 p-1.5 text-center">NO</th>
					<th class="border border-gray-500 p-1.5 text-center">NAMA MATERIAL</th>
					<th class="w-20 border border-gray-500 p-1.5 text-center">SATUAN</th>
					<th class="w-20 border border-gray-500 p-1.5 text-center">JUMLAH</th>
					<th class="w-28 border border-gray-500 p-1.5 text-center">KETERANGAN</th>
				</tr>
			</thead>
			<tbody>
				{#each data.details as item, index}
					<tr>
						<td class="border border-gray-500 p-1.5 text-center">{index + 1}</td>
						<td class="border border-gray-500 p-1.5">{item.materialName}</td>
						<td class="border border-gray-500 p-1.5 text-center">{item.unit}</td>
						<td class="border border-gray-500 p-1.5 text-center">{item.quantity}</td>
						<td class="border border-gray-500 p-1.5 text-center uppercase"
							>{item.description || 'BAIK'}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Kalimat Penutup -->
		<div class="mb-6 leading-relaxed">
			Demikian Berita Acara Serah Terima ini kami buat untuk dipergunakan sebagaimana mestinya
		</div>

		<!-- Tanda Tangan -->
		<div
			class="ttd-block mb-8 flex items-start justify-between px-4 text-center font-['Arial',sans-serif]"
		>
			<!-- TTD Pihak 1 -->
			<div class="flex h-[220px] w-64 flex-col">
				<div>
					<p class="mb-0 font-bold">Pihak Pertama</p>
					<p class="mb-2">Yang Menyerahkan</p>
				</div>

				<div class="relative my-2 flex flex-1 items-center justify-center">
					{#if data.trx.qr}
						<div class="relative flex items-center justify-center">
							<img
								src={data.trx.qr}
								alt="QR Tanda Tangan Digital"
								class="h-28 w-28 object-contain"
							/>
							<img
								src="/logo-pln.png"
								class="pointer-events-none absolute h-8 w-8 object-contain opacity-20"
								alt="Logo PLN watermark"
							/>
						</div>
					{:else}
						<div
							class="flex h-28 w-28 items-center justify-center border border-dashed border-gray-300 text-[9px] text-gray-400"
						>
							QR tidak tersedia
						</div>
					{/if}
				</div>

				<p class="mt-auto font-bold uppercase">
					{data.trx.firstParty || 'NANANG DARYANTO'}
				</p>
			</div>

			<!-- TTD Pihak 2 -->
			<div class="flex h-[220px] w-64 flex-col">
				<div>
					<p class="mb-0 font-bold">Pihak Kedua</p>
					<p class="mb-2">Yang Menerima<br />a/n ULP {(data.trx.targetUlp || '').toUpperCase()}</p>
				</div>

				<div
					class="my-2 flex flex-1 items-center justify-center rounded border border-dashed border-blue-200 bg-blue-50/50 p-2 text-[10px] font-bold text-[#0A417A]"
				>
					<p>
						Divalidasi secara digital melalui<br />Aplikasi PLN Gudang Terintegrasi<br />Oleh Tim
						Lapangan
					</p>
				</div>

				<p class="mt-auto font-bold uppercase">
					{data.trx.takerName || '(..........................................)'}
				</p>
			</div>
		</div>
	</div>

	<!-- KERTAS HALAMAN 2: DOKUMENTASI (Page Break) -->
	{#if data.trx.photo}
		<div
			class="print-container doc-font page-break foto-page mx-auto mt-8 max-w-[210mm] bg-white text-black shadow-2xl"
		>
			<h3 class="mb-8 text-[15px] font-bold uppercase">DOKUMENTASI PERALATAN</h3>

			<div class="flex w-full justify-center">
				<img
					src={data.trx.photo}
					alt="Dokumentasi Serah Terima"
					class="h-auto max-h-[220mm] max-w-full border border-gray-300 object-contain p-1"
				/>
			</div>
		</div>
	{/if}
</div>
