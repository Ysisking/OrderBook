-- =====================================================================
-- OrderBook — skema database Supabase
-- Jalankan SEKALI di Supabase Dashboard > SQL Editor > New query > Run.
-- Aman dijalankan ulang (idempotent) untuk fungsi, policy, dan trigger.
-- Semua data dipisah per pengguna (auth.uid()) lewat Row Level Security.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helper: normalisasi nomor HP Indonesia -> 62xxxxxxxx
-- Dipakai untuk mengenali pelanggan yang sama walau ditulis 08.., +62.., 62..
-- ---------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text language sql immutable as $$
  select case
    when d = '' then ''
    when left(d, 1) = '0' then '62' || substr(d, 2)
    when left(d, 1) = '8' then '62' || d
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s
$$;

-- ---------------------------------------------------------------------
-- PROFILES (1 baris per akun; dibuat otomatis saat daftar)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  username      text not null check (username ~ '^[A-Za-z0-9_]{4,20}$'),
  business_name text not null default '' check (char_length(business_name) <= 80),
  description   text not null default '' check (char_length(description) <= 500),
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- ---------------------------------------------------------------------
-- USER SETTINGS (set up usaha, tampilan, aturan riwayat)
-- ---------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id                    uuid primary key references auth.users(id) on delete cascade,
  theme                      text not null default 'system' check (theme in ('light','dark','system')),
  business_type              text not null default 'jasa_tugas',
  labels                     jsonb not null default '{}'::jsonb,
  task_levels                jsonb not null default
    '[{"value":"l1","label":"Basic"},{"value":"l2","label":"Medium"},{"value":"l3","label":"High"},{"value":"l4","label":"Over High"}]'::jsonb,
  deadline_warning_days      int  not null default 3  check (deadline_warning_days between 0 and 30),
  restore_window_days        int  not null default 30 check (restore_window_days between 1 and 3650),
  allow_restore_after_window boolean not null default false,
  monthly_target             numeric(14,2) not null default 0 check (monthly_target >= 0),
  updated_at                 timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ORDERS (Purchase Order + Riwayat; status 'selesai' = masuk Riwayat)
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  seq            int  not null,
  order_no       text generated always as ('PO-' || lpad(seq::text, 4, '0')) stored,
  customer_name  text not null default '' check (char_length(customer_name) <= 80),
  phone          text not null check (char_length(phone) between 6 and 25),
  phone_norm     text generated always as (public.normalize_phone(phone)) stored,
  task_name      text not null check (char_length(task_name) between 1 and 200),
  deadline       date not null,
  payment_status text not null check (payment_status in ('dp','full','lainnya')),
  payment_note   text not null default '' check (char_length(payment_note) <= 120),
  status         text not null default 'antrian'
                 check (status in ('antrian','on_progress','menunggu_pelunasan','selesai')),
  price          numeric(14,2) not null default 0 check (price >= 0),
  level          text not null,
  region         text not null default '' check (char_length(region) <= 80),
  notes          text not null default '' check (char_length(notes) <= 1000),
  completed_at   timestamptz,
  restored_count int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, seq),
  check (payment_status <> 'lainnya' or char_length(payment_note) > 0)
);
create index if not exists orders_user_status_idx   on public.orders (user_id, status);
create index if not exists orders_user_deadline_idx on public.orders (user_id, deadline);
create index if not exists orders_user_phone_idx    on public.orders (user_id, phone_norm);

-- ---------------------------------------------------------------------
-- CUSTOMER REVIEWS (Performa Pelanggan: penilaian saya terhadap pelanggan)
-- ---------------------------------------------------------------------
create table if not exists public.customer_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  customer_name text not null default '' check (char_length(customer_name) <= 80),
  phone         text not null default '' check (char_length(phone) <= 25),
  phone_norm    text generated always as (public.normalize_phone(phone)) stored,
  task_status   text not null check (task_status in ('sudah','on_progress','return')),
  loyalty_score int  not null check (loyalty_score between 1 and 10),
  behaviors     text[] not null default '{}',
  complaints    text[] not null default '{}',
  notes         text not null default '' check (char_length(notes) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists customer_reviews_user_idx on public.customer_reviews (user_id, phone_norm);

-- ---------------------------------------------------------------------
-- TESTIMONIALS (Ulasan customer yang diisi sendiri; tampil di Beranda)
-- ---------------------------------------------------------------------
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  phone         text not null default '' check (char_length(phone) <= 25),
  phone_norm    text generated always as (public.normalize_phone(phone)) stored,
  rating        int  not null check (rating between 1 and 5),
  sentiment     text not null check (sentiment in ('positif','netral','negatif')),
  content       text not null check (char_length(content) between 1 and 2000),
  review_date   date not null default current_date,
  show_on_home  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists testimonials_user_idx on public.testimonials (user_id, review_date desc);

-- =====================================================================
-- TRIGGERS
-- =====================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Nomor PO per pengguna (PO-0001, PO-0002, ...) + completed_at saat insert
create or replace function public.orders_before_insert()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  perform pg_advisory_xact_lock(hashtext('orders_seq:' || new.user_id::text));
  select coalesce(max(seq), 0) + 1 into new.seq from public.orders where user_id = new.user_id;
  new.completed_at   := case when new.status = 'selesai' then now() else null end;
  new.restored_count := 0;
  new.created_at     := now();
  new.updated_at     := now();
  return new;
end $$;

-- Aturan status:
--  * masuk 'selesai'  -> completed_at = now()  (pindah ke Riwayat)
--  * keluar 'selesai' -> hanya boleh jika umur selesai <= restore_window_days,
--                        kecuali allow_restore_after_window = true di Pengaturan
--  * completed_at, seq, user_id tidak bisa dimanipulasi dari klien
create or replace function public.orders_before_update()
returns trigger language plpgsql as $$
declare
  s public.user_settings%rowtype;
begin
  new.user_id        := old.user_id;
  new.seq            := old.seq;
  new.created_at     := old.created_at;
  new.completed_at   := old.completed_at;
  new.restored_count := old.restored_count;

  if new.status = 'selesai' and old.status <> 'selesai' then
    new.completed_at := now();
  elsif old.status = 'selesai' and new.status <> 'selesai' then
    select * into s from public.user_settings where user_id = old.user_id;
    if not coalesce(s.allow_restore_after_window, false)
       and old.completed_at < now() - make_interval(days => coalesce(s.restore_window_days, 30)) then
      raise exception 'RESTORE_EXPIRED: order % selesai lebih dari % hari lalu dan tidak bisa dipulihkan',
        old.order_no, coalesce(s.restore_window_days, 30)
        using errcode = 'P0001';
    end if;
    new.completed_at   := null;
    new.restored_count := old.restored_count + 1;
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_bi on public.orders;
create trigger orders_bi before insert on public.orders
  for each row execute function public.orders_before_insert();
drop trigger if exists orders_bu on public.orders;
create trigger orders_bu before update on public.orders
  for each row execute function public.orders_before_update();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.user_settings;
create trigger settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();
drop trigger if exists reviews_touch on public.customer_reviews;
create trigger reviews_touch before update on public.customer_reviews
  for each row execute function public.touch_updated_at();
drop trigger if exists testimonials_touch on public.testimonials;
create trigger testimonials_touch before update on public.testimonials
  for each row execute function public.touch_updated_at();

-- Akun baru -> buat profile + settings otomatis
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text := nullif(trim(new.raw_user_meta_data->>'username'), '');
begin
  if uname is null or uname !~ '^[A-Za-z0-9_]{4,20}$'
     or exists (select 1 from public.profiles where lower(username) = lower(uname)) then
    uname := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  insert into public.profiles (id, email, username, business_name)
  values (new.id, new.email, uname,
          left(coalesce(new.raw_user_meta_data->>'business_name', ''), 80))
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email diganti (setelah konfirmasi) -> sinkron ke profiles
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- =====================================================================
-- RPC publik (dipanggil sebelum login)
-- =====================================================================

-- Cek ketersediaan username saat daftar / ganti username
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_username ~ '^[A-Za-z0-9_]{4,20}$'
     and not exists (select 1 from public.profiles
                     where lower(username) = lower(p_username)
                       and id is distinct from auth.uid())
$$;

-- Login pakai username: kembalikan email pemilik username (null jika tidak ada)
create or replace function public.email_for_login(p_identifier text)
returns text language sql stable security definer set search_path = public as $$
  select case
    when position('@' in p_identifier) > 0 then lower(trim(p_identifier))
    else (select email from public.profiles where lower(username) = lower(trim(p_identifier)) limit 1)
  end
$$;

revoke all on function public.username_available(text) from public;
revoke all on function public.email_for_login(text)   from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.email_for_login(text)   to anon, authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY — setiap pengguna hanya melihat datanya sendiri
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.user_settings    enable row level security;
alter table public.orders           enable row level security;
alter table public.customer_reviews enable row level security;
alter table public.testimonials     enable row level security;

drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- email hanya boleh berubah lewat Supabase Auth (trigger di atas)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, business_name, description, avatar_url) on public.profiles to authenticated;

drop policy if exists "settings self" on public.user_settings;
create policy "settings self" on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "orders self" on public.orders;
create policy "orders self" on public.orders for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "reviews self" on public.customer_reviews;
create policy "reviews self" on public.customer_reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "testimonials self" on public.testimonials;
create policy "testimonials self" on public.testimonials for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.user_settings, public.orders, public.customer_reviews, public.testimonials from anon;
grant select, insert, update, delete
  on public.user_settings, public.orders, public.customer_reviews, public.testimonials to authenticated;

-- =====================================================================
-- STORAGE: foto profil (bucket publik, tulis hanya ke folder milik sendiri)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read"  on storage.objects;
drop policy if exists "avatars owner insert" on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
