# Spesifikasi Proyek: Sistem Monitoring & Inventory Gudang PLN UP3 Madura

## 1. Deskripsi Proyek
Aplikasi web full-stack untuk manajemen inventory gudang pusat (UP3) dan gudang cabang (ULP). Sistem ini mendigitalkan pencatatan manual, memantau mutasi barang, mengotomatisasi pembuatan Berita Acara Serah Terima (BAST) PDF dengan validasi QR Code, serta menggunakan sistem Maker-Checker untuk keamanan transaksi.

## 2. Tech Stack
- Frontend: Svelte
- Styling: Tailwind CSS (Fully Responsive Design untuk SELURUH halaman)
- Backend/Logic: Antigravity AI & Gemini.md
- Database Cloud: Aiven (MySQL/PostgreSQL)
- Database Manager: HeidiSQL
- Deployment: Vercel

## 3. Aktor & hak akses Akses Fleksibel
1. Admin UP3 (Pusat / Super Admin): Memiliki akses penuh (Global Monitoring). Bisa melihat stok real-time di gudang pusat maupun stok di 10 unit ULP, melihat seluruh riwayat transaksi dari semua cabang, menginput draf distribusi, dan mengeksekusi mutasi stok. Admin UP3 (Pusat): Bertugas menginput draf distribusi, menyetujui transaksi akhir, mengeksekusi pemindahan stok, dan memantau riwayat global.

2. User ULP (10 Akun Cabang): Tersedia 10 akun unik untuk masing-masing unit ULP sesuai nama ulpnya. Setiap akun hanya bisa melihat stok dan riwayat di unitnya sendiri (Data Isolation). Bertugas melakukan approval penerimaan barang dan mencatat pemakaian lapangan di unit masing-masing. Admin ULP (Cabang): Bertugas mengecek draf, mengambil foto bukti fisik langsung dari kamera HP saat di gudang, memberikan persetujuan (approval) penerimaan, dan mencatat pemakaian lapangan.

- Catatan Akses: Semua aktor dapat mengakses aplikasi dari perangkat apa saja (Mobile/Tablet/Desktop). Aplikasi akan beradaptasi secara otomatis.

## 4. Daftar 10 ULP (Cabang Madura)
1.  Bangkalan
2.  Kamal
3.  Blega
4.  Sampang
5.  Ketapang
6.  Waru
7.  Pamekasan
8.  Sumenep
9.  Ambunten
10.  Arjasa 

## 5. Alur Bisnis Distribusi Barang (Maker-Checker System)
- Tahap 1 (Drafting oleh UP3): Admin UP3 menginput rincian barang yang akan diambil oleh ULP. Sistem membuat dokumen berstatus DRAFT. Stok di database belum dipotong.
- Tahap 2 (Verifikasi & Foto oleh ULP): Perwakilan ULP membuka aplikasi, melihat DRAFT, lalu mengambil foto dokumentasi barang secara langsung (terintegrasi dengan API kamera jika diakses via Mobile). Setelah foto terunggah, perwakilan ULP menekan tombol Setuju. Status berubah menjadi APPROVED_BY_ULP.
- Tahap 3 (Finalisasi & BAST oleh UP3): Admin UP3 memberikan persetujuan akhir. Sistem mengubah draft menjadi file PDF BAST resmi. PDF ini memuat foto dari ULP tadi dan dilengkapi dengan QR Code (pengganti tanda tangan basah) yang jika di-scan mengarah ke URL validasi detail transaksi.
- Tahap 4 (Mutasi Stok Real-time): Muncul tombol khusus "Pindahkan Stok" pada transaksi yang sudah final. Saat diklik Admin UP3, barulah stok di gudang UP3 berkurang dan stok ULP bertambah secara bersamaan.

## 6. Detail Input Form
- Form UP3 (Buat Draf Distribusi): Dropdown ULP Tujuan, Nama Pengambil (Pihak Kedua), dan Rincian Material Dinamis (bisa tambah baris untuk Nama Material, Jumlah, Satuan, Keterangan).
- Form ULP (Verifikasi Penerimaan): Tampilan detail draf, Tombol Ambil Foto (kamera terintegrasi), dan Tombol Setuju.
- Form ULP (Pemakaian Lapangan): Tanggal, Rincian Material yang dipakai (berkurang dari stok ULP), Tujuan Penggunaan (contoh: Pemeliharaan Rutin / Nomor SPK), dan Nama Petugas/Teknisi yang mengambil barang.

## 7. Fitur Tambahan
- Optimasi Storage (Client-Side Image Compression): WAJIB menerapkan kompresi gambar di sisi frontend sebelum diunggah ke server. Foto dari kamera HP dikompres otomatis (misal maksimal 300KB, format WebP/JPEG) agar tidak memberatkan limit penyimpanan server.
- Monitoring Global: Dashboard khusus Admin UP3 untuk memantau sisa stok di 10 ULP secara real-time.
- Tracking Pemakaian ULP: Pencatatan material keluar di level ULP oleh masing-masing user ULP.
- Sistem Notifikasi: Admin ULP mengirim pesan ke Admin UP3 yang muncul sebagai notifikasi real-time.
- Tracking Pemakaian ULP: Material yang dipakai oleh pihak jaringan/optel dicatat oleh Admin ULP, yang akan memotong sisa stok di gudang ULP terkait.
- Sistem Notifikasi: Admin ULP dapat mengirim pesan (misal: info stok kritis) yang akan muncul sebagai notifikasi real-time di dashboard Admin UP3.
- Export Laporan: Fitur filter riwayat berdasarkan bulan dan tombol export ke Excel untuk pelaporan rutin.

## 8. Panduan UI/UX & Branding PLN
- Tema & Warna: Wajib bernuansa corporate PLN. Gunakan palet warna resmi PLN (kombinasi warna Biru Cyan, Kuning, dan Putih/Abu-abu bersih) untuk komponen UI seperti tombol, header, dan notifikasi.
- Logo Integrasi: Wajib meletakkan logo PLN (icon) pada Halaman Login, Pojok Kiri Atas Navbar, dan di bagian Kop Surat pada file PDF BAST yang di-generate.
- 100% Fully Responsive: Seluruh layout WAJIB responsif di semua perangkat. 
- UX Optimization: Saat layar besar (Desktop), tampilkan layout dashboard luas dan form multi-kolom. Saat layar kecil (Mobile), elemen UI otomatis berubah menjadi Card-based, Hamburger menu, dan tombol aksi (seperti foto/kamera) menjadi lebih ramah sentuhan jari (touch-friendly).

## 9. Data Master & Database Schema (Placeholder)
> Catatan untuk AI: Harap gunakan placeholder ini untuk membangun struktur tabel awal.

- Tabel Master Material: [Data Menyusul]
- Tabel Stok Awal (UP3 & 10 ULP): [Data Menyusul]
- Tabel User: [Data Menyusul]
- Tabel Transaksi & Detail Transaksi: Dilengkapi kolom status (DRAFT, APPROVED_ULP, COMPLETED)
- Tabel Notifikasi: Menampung ID, Pengirim, Isi Pesan, Timestamp, Status Baca.