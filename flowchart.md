# Flowchart Sistem SIMOGU PLN (UP3 & ULP)

Berikut adalah visualisasi alur kerja (flowchart) dari sistem inventaris material berdasarkan logika aplikasi saat ini. Alur kerja dibagi menjadi 3 proses utama: **Pengisian Stok Awal**, **Distribusi Material**, dan **Pemakaian Lapangan**.

## 1. Alur Pengisian Stok Awal (Initial Stock)

```mermaid
graph TD
    subgraph ULP [Admin ULP]
        A1[Masuk Tab 'Stok Awal'] --> A2[Input Material & Fisik]
        A2 --> A3[Submit Pengajuan]
    end

    subgraph UP3 [Admin UP3]
        B1[Masuk Tab 'Stok Awal Pusat'] --> B2[Input Material & Fisik]
        B2 --> B3[Submit Stok Pusat]
        B3 --> B4((Stok UP3 Bertambah))

        A3 -->|Status: REQUESTED| C1[Masuk Tab 'Persetujuan Stok ULP']
        C1 --> C2{Cek & Evaluasi?}
        C2 -->|Tolak Data| C3[Status: REJECTED]
        C2 -->|Terima Stok| C4[Status: COMPLETED]
        C4 --> C5((Stok ULP Terisi))
    end
```

---

## 2. Alur Permintaan & Distribusi Material

```mermaid
graph TD
    subgraph ULP [Admin ULP]
        req1[Masuk Tab 'Permintaan'] --> req2[Pilih Barang & Upload Surat]
        req2 --> req3[Submit Permintaan]

        verif1[Masuk Tab 'Terima Barang']
        verif2[Cek Fisik Material Datang]
        verif1 --> verif2
        verif2 --> verif3[Klik 'Konfirmasi Terima Barang']
    end

    subgraph UP3 [Admin UP3]
        dist1[Masuk Tab 'Distribusi Material']

        req3 -->|Status: REQUESTED| dist2[Pilih Permintaan ULP / Distribusi Langsung]
        dist1 --> dist2
        dist2 --> dist3[Input Nama, Alokasi Material & Upload BA]
        dist3 --> dist4[Proses Distribusi]

        dist4 -->|Status: DRAFT| verif1

        verif3 -->|Status: APPROVED_ULP| final1[Validasi Akhir oleh UP3]
        final1 --> final2[Generate QR Code Validasi]
        final2 --> final3((Stok UP3 Berkurang <br> Stok ULP Bertambah))
        final3 --> final4[Status: COMPLETED]
    end
```

---

## 3. Alur Pemakaian Lapangan (Usage)

```mermaid
graph TD
    subgraph ULP [Admin ULP]
        U1[Masuk Tab 'Pemakaian'] --> U2[Input Detail SPK/Tujuan]
        U2 --> U3[Pilih Material & Jumlah]
        U3 --> U4{Simpan Sebagai?}

        U4 -->|Simpan Draf| U5[Status: DRAFT]
        U5 --> U6[Material Terkunci di Riwayat]
        U6 --> U7[Update Draf: Upload Foto Bukti]
        U7 --> U8

        U4 -->|Selesai| U8[Upload Foto Bukti Pemasangan]
        U8 --> U9[Submit Pemakaian]

        U9 --> U10((Stok ULP Berkurang))
        U10 --> U11[Status: COMPLETED]
    end
```

## Keterangan Status Transaksi

- **`REQUESTED`**: ULP telah mengajukan permintaan (baik permintaan barang maupun input stok awal). Menunggu respon dari UP3.
- **`DRAFT`**:
  - (Pada Distribusi): UP3 sudah mengirim barang secara sistem dan fisik, menunggu ULP mengonfirmasi penerimaan.
  - (Pada Pemakaian): ULP mencatat pemakaian lapangan tapi belum melampirkan foto dokumentasi akhir.
- **`APPROVED_ULP`**: ULP sudah menerima fisik barang distribusi dari UP3. UP3 perlu melakukan finalisasi sistem.
- **`COMPLETED`**: Transaksi sukses, mutasi stok (tambah/kurang) telah terjadi dan diakumulasikan ke sistem inventaris utama.
- **`REJECTED`**: UP3 menolak pengajuan atau permintaan dari ULP. Tidak ada perubahan stok yang terjadi.
