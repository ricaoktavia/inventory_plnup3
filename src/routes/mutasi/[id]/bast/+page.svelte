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
</script>

<svelte:head>
	<title>BAST Mutasi - {data.trx.ref}</title>
	<style>
		@media print {
			body { background-color: white !important; font-family: 'Times New Roman', Times, serif; }
			.no-print { display: none !important; }
			.print-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; max-width: none !important; }
			.page-break { page-break-before: always; }
			* { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
		}
		
		/* Arial or Times New Roman is usually standard for documents. The image uses an Arial/Helvetica look */
		.doc-font {
			font-family: Arial, Helvetica, sans-serif;
			font-size: 13px;
			color: black;
		}
	</style>
</svelte:head>

<div class="bg-gray-200 min-h-screen pb-10">
	<div class="w-full no-print flex justify-center sticky top-0 z-50 shadow-md p-4 bg-white/90 backdrop-blur mb-10">
		<button onclick={printDoc} class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center">
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
			Cetak ke PDF / Print
		</button>
		<a href="/mutasi" class="ml-4 text-cyan-700 font-bold py-2 px-6 rounded-lg border border-cyan-300 hover:bg-cyan-50 flex items-center">
			Kembali
		</a>
	</div>

<!-- KERTAS HALAMAN 1: BAST -->
<div class="max-w-[210mm] mx-auto bg-white shadow-2xl p-[15mm_20mm_20mm_20mm] print-container text-black doc-font relative" style="min-height: 297mm">
	
	<!-- Header / Kop -->
	<div class="flex items-start mb-6">
		<!-- Logo Petir PLN Asli -->
		<img src="/logo-pln.png" class="w-12 h-auto object-contain mr-4 mt-1" alt="Logo PLN" />
		<div class="text-[14px] font-bold tracking-wide text-gray-800 leading-snug">
			<div>PT PLN (PERSERO)</div>
			<div>DISTRIBUSI JAWA TIMUR</div>
			<div>UP3 - MADURA</div>
		</div>
	</div>

	<hr class="border-t-2 border-black mb-1">
	<hr class="border-t-[1px] border-black mb-8">

	<!-- Judul -->
	<div class="text-center mb-8">
		<h2 class="text-[17px] font-bold tracking-wide inline-block border-b-[2px] border-black pb-0.5" style="border-bottom-style: double;">
			BERITA ACARA SERAH TERIMA
		</h2>
	</div>

	<!-- Konten Paragraf 1 -->
	<div class="mb-6 leading-relaxed">
		Pada hari <strong>{hari}</strong> Tanggal <strong>{tanggal}</strong> Bulan <strong>{bulan}</strong> Tahun <strong>{tahun}</strong>, yang bertanda tangan dibawah ini :
	</div>

	<!-- Pihak 1 -->
	<div class="pl-10 mb-4 leading-relaxed">
		<table class="w-full">
			<tbody>
				<tr><td class="w-24">Nama</td><td class="w-4 text-center">:</td><td class="uppercase">NANANG DARYANTO</td></tr>
				<tr><td>Jabatan</td><td class="text-center">:</td><td class="uppercase">OF KIN DAN ADM LAY GAN</td></tr>
				<tr><td>Unit</td><td class="text-center">:</td><td class="uppercase">UP3 MADURA</td></tr>
			</tbody>
		</table>
	</div>
	<div class="mb-6 leading-relaxed">
		Selanjutnya disebut sebagai <strong>Pihak Pertama</strong>
	</div>

	<!-- Pihak 2 -->
	<div class="pl-10 mb-4 leading-relaxed">
		<table class="w-full">
			<tbody>
				<tr><td class="w-24">Nama</td><td class="w-4 text-center">:</td><td class="uppercase">{data.trx.takerName || '................'}</td></tr>
				<tr><td>Jabatan</td><td class="text-center">:</td><td class="uppercase">TEKNISI / PETUGAS GUDANG</td></tr>
				<tr><td>Unit</td><td class="text-center">:</td><td class="uppercase">ULP {data.trx.targetUlp || '................'}</td></tr>
			</tbody>
		</table>
	</div>
	<div class="mb-6 leading-relaxed">
		Selanjutnya disebut sebagai <strong>Pihak Kedua</strong>
	</div>

	<!-- Kalimat Peralihan -->
	<div class="mb-4 leading-relaxed">
		<strong>Pihak Pertama</strong> telah menyerahkan barang kepada <strong>Pihak Kedua</strong> dengan rincian sebagai berikut :
	</div>

	<!-- Tabel Material -->
	<table class="w-full border-collapse border border-gray-500 mb-8 text-[12px]">
		<thead>
			<tr class="bg-gray-50">
				<th class="border border-gray-500 p-1.5 text-center w-10">NO</th>
				<th class="border border-gray-500 p-1.5 text-center">NAMA MATERIAL</th>
				<th class="border border-gray-500 p-1.5 text-center w-20">SATUAN</th>
				<th class="border border-gray-500 p-1.5 text-center w-20">JUMLAH</th>
				<th class="border border-gray-500 p-1.5 text-center w-28">KETERANGAN</th>
			</tr>
		</thead>
		<tbody>
			{#each data.details as item, index}
				<tr>
					<td class="border border-gray-500 p-1.5 text-center">{index + 1}</td>
					<td class="border border-gray-500 p-1.5">{item.materialName}</td>
					<td class="border border-gray-500 p-1.5 text-center">{item.unit}</td>
					<td class="border border-gray-500 p-1.5 text-center">{item.quantity}</td>
					<td class="border border-gray-500 p-1.5 text-center uppercase">{item.description || 'BAIK'}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Kalimat Penutup -->
	<div class="mb-12 leading-relaxed">
		Demikian Berita Acara Serah Terima ini kami buat untuk dipergunakan sebagaimana mestinya
	</div>

	<!-- Tanda Tangan -->
	<div class="flex justify-between items-start text-center mb-8 px-4 font-['Arial',sans-serif]">
		<!-- TTD Pihak 1 -->
		<div class="w-64 flex flex-col h-[220px]">
			<div>
				<p class="font-bold mb-0">Pihak Pertama</p>
				<p class="mb-2">Yang Menyerahkan</p>
			</div>
			
			<div class="flex-1 flex justify-center items-center relative my-2">
			{#if data.trx.qr}
				<img src={data.trx.qr} alt="QR Validasi" class="w-24 h-24 object-contain mix-blend-multiply" />
				<div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
				<img src="/logo-pln.png" class="w-20 h-20 object-contain transform -rotate-12 opacity-30 grayscale" alt="Logo PLN watermark" />
				</div>
			{/if}
			</div>

			<p class="font-bold uppercase mt-auto">NANANG DARYANTO</p>
		</div>

		<!-- TTD Pihak 2 -->
		<div class="w-64 flex flex-col h-[220px]">
			<div>
				<p class="font-bold mb-0">Pihak Kedua</p>
				<p class="mb-2">Yang Menerima<br>a/n ULP {(data.trx.targetUlp || '').toUpperCase()}</p>
			</div>

			<div class="flex-1 flex items-center justify-center my-2 text-[#0A417A] text-[10px] font-bold border border-dashed border-blue-200 bg-blue-50/50 rounded p-2">
				<p>Divalidasi secara digital melalui<br>Aplikasi PLN Gudang Terintegrasi<br>Oleh Tim Lapangan</p>
			</div>

			<p class="font-bold uppercase mt-auto">{data.trx.takerName || '(..........................................)'}</p>
		</div>
	</div>

</div>

<!-- KERTAS HALAMAN 2: DOKUMENTASI (Page Break) -->
{#if data.trx.photo}
<div class="max-w-[210mm] mx-auto bg-white shadow-2xl p-[20mm] print-container text-black doc-font mt-8 page-break" style="min-height: 297mm">
	<h3 class="font-bold text-[15px] mb-8 uppercase">DOKUMENTASI PERALATAN</h3>
	
	<div class="w-full flex justify-center">
		<img src={data.trx.photo} alt="Dokumentasi Serah Terima" class="max-w-full h-auto max-h-[220mm] object-contain border border-gray-300 p-1" />
	</div>
</div>
{/if}
</div>
