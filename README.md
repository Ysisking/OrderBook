# OrderBook — Sistem Pencatatan Pesanan

Web app pencatatan pesanan untuk usaha jasa (default: jasa pengerjaan tugas) yang bisa disesuaikan ke jenis usaha lain.
Multi-pengguna: setiap akun (email/username) punya data terpisah.

**Web:** https://orderbook.gamma-tau.workers.dev

**Stack:** React 18 + Vite · Tailwind CSS · Recharts · Supabase (Auth, Postgres + RLS, Storage) · Cloudflare Workers (deploy otomatis dari `main`)

## Menu

| Menu | Isi |
|---|---|
| **Beranda** | Capaian harian & bulanan, grafik pendapatan harian, komposisi order aktif, pemberitahuan (hampir deadline / on progress / terselesaikan), kabar ulasan pelanggan |
| **Purchase Order** | Dua tampilan: **Tabel** (tab Semua/Antrian/Progress/Pelunasan/Terlambat, pilih banyak + aksi massal, status bisa diklik) dan **Papan tiket** (kolom per status, seret tiket untuk pindah status, jatuhkan ke Selesai). Klik baris/tiket → panel detail |
| **Performa Pelanggan** | Kartu penilaian: status tugas, skor loyalitas 1–10, perilaku & jenis keluhan (dropdown ceklis) |
| **Ulasan** | Ulasan pelanggan yang diisi sendiri; tampil sebagai berita di Beranda |
| **Riwayat** | Order selesai; bisa dipulihkan ke On Progress ≤ 30 hari (bisa diubah di Pengaturan) |
| **Dashboard** | Ulasan positif/negatif, order selesai & penghasilan per bulan, selesai per level, repeat order, kepuasan tertinggi, region terbanyak, jenis keluhan |
| **Data Analyst** | Chatbot jawaban otomatis (kinerja, perspektif pelanggan, revenue, kenaikan per minggu); modul AI menyusul |
| **Pengaturan** | Profil (foto, username, nama usaha, deskripsi) · Set Up (preset jenis usaha, nama kolom, level, aturan) · Mode tampilan · Privasi (sandi, username, email) · **Aplikasi terhubung** (MoneyOut) |

## Arsitektur tampilan & rujukan

OrderBook meniru pola aplikasi yang sudah teruji untuk pekerjaan berbasis order, bukan dashboard kartu generik:

| Pola | Rujukan | Di OrderBook |
|---|---|---|
| Daftar order padat + tab tampilan tersimpan + aksi massal + panel detail samping | Shopify Admin (Orders) | Purchase Order mode Tabel, panel detail (slide-over / bottom sheet di HP) |
| Sidebar berkelompok, palet perintah, pintasan keyboard | Linear | Sidebar Operasional/Pelanggan/Analisis, `Ctrl/⌘ K`, `N` order baru, `/` cari, `Ctrl/⌘ Enter` simpan |
| Tiket pesanan dijepit di rel antara dapur dan kasir | Kitchen Display System (Square KDS), rel tiket restoran | Mode Papan: tiket kertas bertepi sobek + penjepit, kolom per status, seret-lepas |
| Tab bar bawah + tombol tambah di tengah | Aplikasi kasir/POS di HP | Navigasi HP: Beranda · Order · ＋ · Riwayat · Menu |

Prinsip: latar kanvas netral + panel bergaris rambut (bukan bayangan tebal), satu warna aksen biru, warna merah/kuning/hijau hanya untuk status, angka tabular.
Logo (`public/favicon.svg`): selembar tiket pesanan dijepit di tali jendela dapur–kasir.

## Hubungan akun dengan MoneyOut

Pengaturan → **Aplikasi terhubung**. Akun dihubungkan lewat **email yang sama** (OrderBook dan MoneyOut memakai project Supabase terpisah):
pengguna masuk sekali ke MoneyOut dari OrderBook, sesi MoneyOut disimpan terpisah di browser (`ob-moneyout-auth`), password tidak disimpan.

- Order **Sudah Selesai** otomatis masuk ke menu **Pemasukan** MoneyOut sebagai *Rekap bulanan (seperti gaji)* atau *Per order*,
  dengan kategori (default **Gaji Bulanan**), dompet, dan tanggal mulai yang dipilih.
- Sinkron = rekonsiliasi idempoten (`src/lib/moneyout.js`): dipulihkan/dihapus/diubah harganya → pemasukan ikut menyesuaikan.
  Transaksi milik OrderBook dikenali dari awalan catatan `OrderBook · PO-…` / `OrderBook · Rekap YYYY-MM`, jadi **tidak perlu perubahan skema** MoneyOut.
  Di MoneyOut transaksi ini diberi label ORDERBOOK dan tampil hanya-baca.
- Pengaturan hubungan disimpan di metadata akun OrderBook (`user_metadata.moneyout`). Sinkron berjalan di perangkat yang sudah masuk ke MoneyOut.

## Setup

Lihat [DEPLOY.md](DEPLOY.md).
