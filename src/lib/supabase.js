import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/** Ambil semua baris (Supabase membatasi 1000 baris per request). */
export async function fetchAll(table, { select = '*', order = 'created_at', ascending = false } = {}) {
  const page = 1000
  let from = 0
  const rows = []
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order, { ascending })
      .range(from, from + page - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < page) break
    from += page
  }
  return rows
}

/** Ubah error Supabase/Postgres menjadi pesan yang bisa dibaca pengguna. */
export function errorMessage(error) {
  if (!error) return ''
  const msg = error.message || String(error)
  if (msg.includes('RESTORE_EXPIRED')) {
    return 'Order ini sudah melewati batas waktu pemulihan. Ubah aturan di Pengaturan > Set Up jika perlu.'
  }
  if (msg.includes('profiles_username_lower_idx')) return 'Username sudah dipakai akun lain.'
  if (msg.includes('Invalid login credentials')) return 'Email/username atau kata sandi salah.'
  if (msg.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk email Anda.'
  if (msg.includes('User already registered')) return 'Email sudah terdaftar. Silakan masuk.'
  if (msg.includes('Password should be')) return 'Kata sandi terlalu lemah (minimal 8 karakter).'
  if (msg.includes('rate limit')) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'
  if (msg.includes('Failed to fetch')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
  if (msg.includes('orders_check')) return 'Status pembayaran "Lainnya" wajib diberi keterangan.'
  return msg
}
