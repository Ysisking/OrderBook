# OrderBook — Sistem Pencatatan Pesanan

Web app pencatatan pesanan untuk usaha jasa (default: jasa pengerjaan tugas) yang bisa disesuaikan ke jenis usaha lain.
Multi-pengguna: setiap akun (email/username) punya data terpisah.

**Stack:** React 18 + Vite · Tailwind CSS · Recharts · Supabase (Auth, Postgres + RLS, Storage) · Vercel

## Menu

| Menu | Isi |
|---|---|
| **Beranda** | Capaian harian & bulanan, grafik pendapatan harian, komposisi order aktif, pemberitahuan (hampir deadline / on progress / terselesaikan), kabar ulasan pelanggan |
| **Purchase Order** | Input & kelola order aktif: no. HP, nama tugas, deadline (kalender), status pembayaran (DP/Full/Lainnya + keterangan), status order, harga, level, region |
| **Performa Pelanggan** | Kartu penilaian: status tugas, skor loyalitas 1–10, perilaku & jenis keluhan (dropdown ceklis) |
| **Ulasan** | Ulasan pelanggan yang diisi sendiri; tampil sebagai berita di Beranda |
| **Riwayat** | Order selesai; bisa dipulihkan ke On Progress ≤ 30 hari (bisa diubah di Pengaturan) |
| **Dashboard** | Ulasan positif/negatif, order selesai & penghasilan per bulan, selesai per level, repeat order, kepuasan tertinggi, region terbanyak, jenis keluhan |
| **Data Analyst** | Insight otomatis sementara; modul AI menyusul |
| **Pengaturan** | Profil (foto, username, nama usaha, deskripsi) · Set Up (preset jenis usaha, nama kolom, level, aturan) · Mode tampilan · Privasi (sandi, username, email) |

## Setup

Lihat [DEPLOY.md](DEPLOY.md).
