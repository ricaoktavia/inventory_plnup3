SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `transaction_details`;
TRUNCATE TABLE `transactions`;
TRUNCATE TABLE `stocks`;
TRUNCATE TABLE `materials`;

SET FOREIGN_KEY_CHECKS = 1;

-- Katalog Material Asli PLN Standar
INSERT INTO `materials` (`id`, `name`, `unit`, `description`) VALUES
(1, 'Kabel SR (Twsited) 2x10 mm2', 'MTR', 'Kabel Sambungan Rumah standar'),
(2, 'Kabel LVTC 3x70+50 mm2', 'MTR', 'Kabel utama Jaringan Tegangan Rendah'),
(3, 'Kabel NYFGbY 4x95 mm2', 'MTR', 'Kabel tanah tegangan rendah'),
(4, 'Trafo Distribusi 3P 20kV/400V 100 kVA', 'UNIT', 'Trafo Tiang 100 kVA'),
(5, 'Trafo Distribusi 3P 20kV/400V 200 kVA', 'UNIT', 'Trafo Tiang 200 kVA'),
(6, 'MCB 1 Fasa 2A', 'PCS', 'Pengaman pembatas pelanggan 450VA'),
(7, 'MCB 1 Fasa 4A', 'PCS', 'Pengaman pembatas pelanggan 900VA'),
(8, 'MCB 1 Fasa 6A', 'PCS', 'Pengaman pembatas pelanggan 1300VA'),
(9, 'KWh Meter Prabayar 1 Fasa', 'UNIT', 'Sikap Meter Token Tunggal'),
(10, 'KWh Meter Pascabayar 3 Fasa', 'UNIT', 'Meter pascabayar pabrik/pelanggan besar'),
(11, 'Fuse Link 3A', 'PCS', 'Pengaman jaringan SUTM / FCO'),
(12, 'Fuse Link 5A', 'PCS', 'Pengaman Trafo/JTM DCO 5 Ampere'),
(13, 'Fuse Link 12.5A', 'PCS', 'Pengaman ujung SUTM DCO'),
(14, 'NH Fuse 160A', 'PCS', 'Pengaman fasa di PHB-TR'),
(15, 'NH Fuse 250A', 'PCS', 'Pelindung Trafo di jurusan PHB-TR'),
(16, 'Isolator Tumpu 20kV (Pin Insulator)', 'SET', 'Untuk tiang lurus SUTM'),
(17, 'Isolator Tarik 20kV (Suspension)', 'SET', 'Untuk tiang awal/akhir sudut SUTM'),
(18, 'Tiang Beton 9 Meter - 200 daN', 'BGH', 'Tiang JTR Standar'),
(19, 'Tiang Beton 11 Meter - 350 daN', 'BGH', 'Tiang SUTM Standar'),
(20, 'Silicone / Pelindung Hewan (Berang-berang)', 'PCS', 'Cover bushing trafo / isolator'),
(21, 'Joint Sleeve AL 70mm', 'PCS', 'Konektor SR / sambungan kabel JTR'),
(22, 'Dead End Assembly (JTR)', 'SET', 'Klem tarik akhir kabel Twisted');

-- Titipan Stok Awal Murni di Pusat UP3
INSERT INTO `stocks` (`material_id`, `ulp_id`, `quantity`) VALUES
(1, NULL, 5000),
(2, NULL, 1200),
(3, NULL, 400),
(4, NULL, 10),
(5, NULL, 5),
(6, NULL, 800),
(7, NULL, 1500),
(8, NULL, 1000),
(9, NULL, 2500),
(10, NULL, 50),
(11, NULL, 300),
(12, NULL, 300),
(13, NULL, 200),
(14, NULL, 500),
(15, NULL, 350),
(16, NULL, 1000),
(17, NULL, 800),
(18, NULL, 150),
(19, NULL, 80),
(20, NULL, 1200),
(21, NULL, 600),
(22, NULL, 850);
