-- OrderBook · Tanggal Transaksi (order_date)
-- Jalankan sekali di Supabase → SQL Editor project OrderBook. Aman dijalankan ulang.

-- 1) Kolom tanggal transaksi (tanggal order masuk), default hari ini waktu Jakarta
alter table public.orders
  add column if not exists order_date date;

-- 2) Isi data lama dari tanggal order dicatat (zona Asia/Jakarta)
update public.orders
   set order_date = (created_at at time zone 'Asia/Jakarta')::date
 where order_date is null;

alter table public.orders
  alter column order_date set default ((now() at time zone 'Asia/Jakarta')::date),
  alter column order_date set not null;

-- 3) Indeks untuk laporan per tanggal transaksi
create index if not exists orders_user_order_date_idx on public.orders (user_id, order_date desc);

-- 4) Muat ulang cache skema API supaya kolom baru langsung dikenali
notify pgrst, 'reload schema';
