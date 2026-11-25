// =====================================================================
// Hubungan akun OrderBook → MoneyOut
//
// OrderBook dan MoneyOut memakai project Supabase yang terpisah. Akun dihubungkan
// berdasarkan EMAIL yang sama: pengguna masuk sekali ke MoneyOut dari OrderBook
// (password MoneyOut), lalu sesi MoneyOut disimpan terpisah di browser
// (storageKey sendiri, tidak mengganggu sesi OrderBook).
//
// Sinkronisasi bersifat rekonsiliasi (idempoten): setiap kali dijalankan, isi
// MoneyOut disamakan dengan order "Sudah Selesai" di OrderBook. Transaksi yang
// dikelola OrderBook dikenali dari awalan catatannya:
//   "OrderBook · PO-0007 · Nama tugas"         (mode per order)
//   "OrderBook · Rekap 2026-11 · 12 order"     (mode rekap bulanan, seperti gaji)
// Order dipulihkan dari Riwayat / dihapus / diubah harganya → transaksinya ikut
// dihapus / diperbarui. Tidak butuh perubahan skema database MoneyOut.
// =====================================================================
import { createClient } from '@supabase/supabase-js'
import { endOfMonth, isSameMonth } from 'date-fns'
import { dateKey, formatMonth, toDate } from './format'

const MO_URL = import.meta.env.VITE_MONEYOUT_URL || 'https://nrzvlugmkztqfqlnpxok.supabase.co'
// Kunci anon MoneyOut memang publik (sudah terkirim ke browser di web MoneyOut); data dijaga RLS.
const MO_KEY =
  import.meta.env.VITE_MONEYOUT_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yenZsdWdta3p0cWZxbG5weG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxOTc4MDYsImV4cCI6MjExMDc3MzgwNn0.iqUcqMe9G1RkGjt7PZRwS34eK0e37sqM5CkGw6O3yCE'
export const MONEYOUT_WEB = 'https://moneyout.gamma-tau.workers.dev'

export const PREFIX = 'OrderBook · '
const REF_RE = /^OrderBook · (PO-\d+|Rekap \d{4}-\d{2})(?: ·|$)/

/** Kategori pemasukan bawaan MoneyOut (lib/categories.js di repo MoneyOut). */
export const MO_INCOME_CATEGORIES = ['Gaji Bulanan', 'Freelance / Harian', 'Bonus & THR', 'Usaha / Jualan', 'Hasil Investasi', 'Pemasukan Lain']

export const MODES = [
  { value: 'monthly', label: 'Rekap bulanan (seperti gaji)', desc: 'Satu pemasukan per bulan berisi total order selesai bulan itu.' },
  { value: 'per_order', label: 'Per order', desc: 'Setiap order selesai menjadi satu pemasukan sendiri.' },
]

export const DEFAULT_CONFIG = {
  linked: false,
  mo_email: '',
  wallet_id: null,
  wallet_name: '',
  category: 'Gaji Bulanan',
  mode: 'monthly',
  since: dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  linked_at: null,
}

let client = null
export function moClient() {
  if (!client) {
    client = createClient(MO_URL, MO_KEY, {
      auth: { storageKey: 'ob-moneyout-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  }
  return client
}

const friendly = (error) => {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Password MoneyOut salah, atau email ini belum terdaftar di MoneyOut.'
  if (m.includes('email not confirmed')) return 'Email akun MoneyOut belum dikonfirmasi. Buka tautan konfirmasi di email Anda dulu.'
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Tidak bisa terhubung ke MoneyOut. Periksa koneksi internet.'
  if (m.includes('row-level security') || error?.code === '42501') return 'MoneyOut menolak penulisan. Pastikan akun MoneyOut Anda sudah aktif (disetujui admin).'
  return error?.message || 'Terjadi kesalahan di MoneyOut.'
}
const check = ({ data, error }) => {
  if (error) throw new Error(friendly(error))
  return data
}

/** Status sesi MoneyOut di browser ini. */
export async function moSession(expectedEmail) {
  const { data } = await moClient().auth.getSession()
  const s = data.session
  if (!s) return { state: 'signed_out' }
  if (expectedEmail && s.user.email?.toLowerCase() !== expectedEmail.toLowerCase()) return { state: 'mismatch', email: s.user.email }
  return { state: 'ok', user: s.user }
}

/** Masuk ke MoneyOut. Email WAJIB sama dengan email akun OrderBook. */
export async function moConnect(email, password) {
  const c = moClient()
  const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(friendly(error))
  if (data.user.email?.toLowerCase() !== email.trim().toLowerCase()) {
    await c.auth.signOut({ scope: 'local' })
    throw new Error('Email akun MoneyOut berbeda dengan email OrderBook.')
  }
  return moAccount()
}

export async function moDisconnect() {
  await moClient().auth.signOut({ scope: 'local' })
}

/** Profil, status akun, dompet, dan kategori pemasukan pengguna di MoneyOut. */
export async function moAccount() {
  const c = moClient()
  const { data: s } = await c.auth.getSession()
  const uid = s.session?.user.id
  if (!uid) throw new Error('Belum masuk ke MoneyOut.')
  const [prof, wallets, cats] = await Promise.all([
    c.from('mo_profiles').select('*').eq('id', uid).maybeSingle(),
    c.from('mo_accounts').select('id,name,type').order('created_at'),
    c.from('mo_categories').select('name').eq('kind', 'pemasukan').order('created_at'),
  ])
  const p = prof.data || {}
  const status = p.status || 'active'
  const custom = (cats.data || []).map((x) => x.name).filter((n) => !MO_INCOME_CATEGORIES.some((d) => d.toLowerCase() === n.toLowerCase()))
  return {
    email: s.session.user.email,
    username: p.username || '',
    status,
    active: status === 'active',
    wallets: wallets.data || [],
    categories: [...MO_INCOME_CATEGORIES, ...custom],
  }
}

// ---------------------------------------------------------------- Rekonsiliasi
const completedDate = (o) => dateKey(toDate(o.completed_at))
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** Baris pemasukan yang SEHARUSNYA ada di MoneyOut, dari order OrderBook. */
export function desiredRows(orders, cfg, today = new Date()) {
  const done = orders.filter((o) => o.status === 'selesai' && o.completed_at && Number(o.price) > 0 && completedDate(o) >= cfg.since)
  const base = { kind: 'pemasukan', category: cfg.category, account_id: cfg.wallet_id || null }
  const rows = new Map()
  if (cfg.mode === 'per_order') {
    for (const o of done) {
      rows.set(o.order_no, {
        ...base,
        amount: Number(o.price),
        date: completedDate(o),
        note: clip(`${PREFIX}${o.order_no} · ${o.task_name}`, 200),
      })
    }
  } else {
    const byMonth = new Map()
    for (const o of done) {
      const m = completedDate(o).slice(0, 7)
      const g = byMonth.get(m) || { amount: 0, count: 0, last: '' }
      g.amount += Number(o.price)
      g.count += 1
      if (completedDate(o) > g.last) g.last = completedDate(o)
      byMonth.set(m, g)
    }
    for (const [m, g] of byMonth) {
      const monthStart = toDate(m + '-01')
      // Bulan yang sudah lewat dicatat di akhir bulan (seperti gaji); bulan berjalan di tanggal order terakhir.
      const date = isSameMonth(monthStart, today) ? g.last : dateKey(endOfMonth(monthStart))
      rows.set(`Rekap ${m}`, {
        ...base,
        amount: Math.round(g.amount * 100) / 100,
        date,
        note: `${PREFIX}Rekap ${m} · ${g.count} order (${formatMonth(monthStart)})`,
      })
    }
  }
  return rows
}

export const refOf = (note) => note?.match(REF_RE)?.[1] ?? null

/** Hitung selisih: apa yang harus ditambah, diubah, dihapus. Fungsi murni (mudah diuji). */
export function diff(existing, desired) {
  const insert = []
  const update = []
  const remove = []
  const seen = new Set()
  for (const tx of existing) {
    const ref = refOf(tx.note)
    if (!ref) continue
    const want = desired.get(ref)
    if (!want || seen.has(ref)) {
      remove.push(tx.id) // tidak diinginkan lagi, atau duplikat
      continue
    }
    seen.add(ref)
    const same =
      Number(tx.amount) === want.amount &&
      tx.date === want.date &&
      tx.note === want.note &&
      tx.category === want.category &&
      (tx.account_id || null) === (want.account_id || null)
    if (!same) update.push({ id: tx.id, ...want })
  }
  for (const [ref, row] of desired) if (!seen.has(ref)) insert.push(row)
  return { insert, update, remove }
}

/** Jalankan sinkronisasi ke MoneyOut. Mengembalikan ringkasan perubahan. */
export async function moSync(orders, cfg) {
  const c = moClient()
  const existing = []
  for (let from = 0; ; from += 1000) {
    const data = check(
      await c
        .from('mo_transactions')
        .select('id,amount,date,note,category,account_id')
        .eq('kind', 'pemasukan')
        .like('note', `${PREFIX}%`)
        .order('created_at')
        .range(from, from + 999),
    )
    existing.push(...data)
    if (data.length < 1000) break
  }
  const desired = desiredRows(orders, cfg)
  const d = diff(existing, desired)
  if (d.remove.length) check(await c.from('mo_transactions').delete().in('id', d.remove))
  if (d.insert.length) check(await c.from('mo_transactions').insert(d.insert))
  for (const u of d.update) {
    const { id, ...patch } = u
    check(await c.from('mo_transactions').update(patch).eq('id', id))
  }
  const total = [...desired.values()].reduce((s, r) => s + r.amount, 0)
  return { added: d.insert.length, updated: d.update.length, removed: d.remove.length, rows: desired.size, total, at: new Date().toISOString() }
}

/** Hapus semua pemasukan yang dibuat OrderBook di MoneyOut (dipakai saat memutus hubungan, opsional). */
export async function moRemoveAll() {
  const c = moClient()
  const data = check(await c.from('mo_transactions').select('id').eq('kind', 'pemasukan').like('note', `${PREFIX}%`))
  if (data.length) check(await c.from('mo_transactions').delete().in('id', data.map((x) => x.id)))
  return data.length
}

// ---------------------------------------------------------------- Penyimpanan konfigurasi & status
// Konfigurasi disimpan di metadata akun OrderBook (ikut akun, berlaku di semua perangkat).
export const readConfig = (user) => ({ ...DEFAULT_CONFIG, ...(user?.user_metadata?.moneyout || {}) })

const LAST_KEY = 'ob-moneyout-last'
export const readLast = () => {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) || 'null')
  } catch {
    return null
  }
}
export const writeLast = (v) => {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(v))
  } catch {
    /* abaikan */
  }
}
