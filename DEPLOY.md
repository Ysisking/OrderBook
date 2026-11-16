# Deploy OrderBook (Supabase + Vercel)

Total ±15 menit, cukup sekali. Setelah ini setiap `git push` ke `main` otomatis ter-deploy oleh Vercel.

## 1. Supabase — database & login

1. Buka <https://supabase.com/dashboard> → **New project**.
   - Name: `orderbook` · Region: **Southeast Asia (Singapore)** · simpan *database password*.
2. Setelah project siap: **SQL Editor → New query** → tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Hasilnya: tabel `profiles`, `user_settings`, `orders`, `customer_reviews`, `testimonials`, bucket foto `avatars`,
   dan Row Level Security (setiap akun hanya bisa membaca/menulis datanya sendiri).
3. **Authentication → Sign In / Providers → Email**: pastikan *Enable Email provider* aktif.
   *Confirm email* boleh aktif (disarankan) — pengguna baru harus klik link di email sebelum bisa masuk.
4. **Project Settings → API**: salin **Project URL** dan **anon public key** (untuk langkah 2).

## 2. Vercel — hosting web

1. <https://vercel.com/new> → **Import** repo GitHub `Ysisking/OrderBook`.
2. Framework terdeteksi otomatis: **Vite** (Build `npm run build`, Output `dist`). Biarkan default.
3. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL dari Supabase |
   | `VITE_SUPABASE_ANON_KEY` | anon public key dari Supabase |

4. **Deploy** → dapat URL `https://orderbook-xxxx.vercel.app`.

## 3. Hubungkan URL Vercel ke Supabase (wajib untuk email konfirmasi & reset sandi)

Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://orderbook-xxxx.vercel.app`
- **Redirect URLs**: tambahkan `https://orderbook-xxxx.vercel.app/**` (dan `http://localhost:5173/**` untuk development)

Tanpa ini, link di email konfirmasi/reset sandi akan mengarah ke `localhost`.

## 4. Coba

Buka URL Vercel → **Daftar** → konfirmasi email → masuk → isi **Pengaturan → Set Up** sesuai jenis usaha.

---

## Development lokal

```bash
npm install
cp .env.example .env.local   # isi 2 variabel Supabase
npm run dev                  # http://localhost:5173
```

## Catatan teknis

- **Pemisahan data per pengguna** dijamin di database (RLS `user_id = auth.uid()`), bukan hanya di tampilan.
  Login bisa dengan email **atau** username.
- **Aturan Riwayat** dijalankan oleh trigger database: order selesai hanya bisa dipulihkan ke *On Progress*
  jika umurnya ≤ `restore_window_days` (default 30 hari), kecuali *Izinkan pemulihan setelah batas* diaktifkan
  di Pengaturan → Set Up. Kolom `completed_at` tidak bisa dimanipulasi dari aplikasi.
- **Pendapatan** dihitung dari order berstatus *Sudah Selesai*, pada bulan `completed_at`.
- **Pelanggan** dikenali dari nomor HP yang dinormalisasi (`0812…`, `+62 812…`, `62812…` dianggap sama),
  dipakai untuk repeat order & ranking kepuasan.
- **Email bawaan Supabase** dibatasi ±2 email/jam pada paket gratis. Untuk dipakai banyak pengguna (saat dijual),
  pasang SMTP sendiri: Supabase → Authentication → Emails → SMTP Settings (mis. Gmail App Password / Resend).
- Mengubah skema di kemudian hari: jalankan ulang `supabase/schema.sql` (aman diulang) atau tambahkan file migrasi baru.
