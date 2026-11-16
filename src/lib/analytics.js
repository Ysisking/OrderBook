// =====================================================================
// Perhitungan laporan (murni, tanpa efek samping) — dipakai Beranda,
// Dashboard, dan Data Analyst. Semua input adalah array baris Supabase.
// =====================================================================
import { addMonths, eachDayOfInterval, endOfMonth, startOfMonth, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { daysUntil, monthKey, dateKey, toDate, normalizePhone, titleCase } from './format'
import { ACTIVE_STATUSES } from './constants'

export const isDone = (o) => o.status === 'selesai'
export const isActive = (o) => ACTIVE_STATUSES.includes(o.status)
export const sumPrice = (list) => list.reduce((s, o) => s + (Number(o.price) || 0), 0)

/** Pendapatan diakui saat order selesai (completed_at). */
export const completedIn = (orders, period) =>
  orders.filter((o) => isDone(o) && o.completed_at && (period === 'all' || monthKey(o.completed_at) === period))

export const createdIn = (orders, period) =>
  orders.filter((o) => period === 'all' || monthKey(o.created_at) === period)

export const completedOn = (orders, day) => orders.filter((o) => isDone(o) && o.completed_at && dateKey(o.completed_at) === day)
export const createdOn = (orders, day) => orders.filter((o) => dateKey(o.created_at) === day)

export function deadlineState(order, warnDays = 3) {
  if (isDone(order)) return 'done'
  const n = daysUntil(order.deadline)
  if (n === null) return 'ok'
  if (n < 0) return 'overdue'
  if (n <= warnDays) return 'soon'
  return 'ok'
}

export const customerKey = (row) => normalizePhone(row.phone) || `nama:${(row.customer_name || '').trim().toLowerCase()}`

/** Daftar pelanggan unik dari order (dikenali dari nomor HP yang dinormalisasi). */
export function customersFromOrders(orders) {
  const map = new Map()
  const sorted = [...orders].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  for (const o of sorted) {
    const key = customerKey(o)
    if (!key || key === 'nama:') continue
    const c = map.get(key) || { key, name: '', phone: o.phone, orders: 0, completed: 0, spent: 0, lastOrder: null }
    if (o.customer_name?.trim()) c.name = o.customer_name.trim()
    c.phone = o.phone || c.phone
    c.orders += 1
    if (isDone(o)) {
      c.completed += 1
      c.spent += Number(o.price) || 0
    }
    c.lastOrder = o.created_at
    map.set(key, c)
  }
  return [...map.values()]
}

export const repeatCustomers = (orders, min = 2) =>
  customersFromOrders(orders)
    .filter((c) => c.orders >= min)
    .sort((a, b) => b.orders - a.orders || b.spent - a.spent)

/**
 * Kepuasan pelanggan = rata-rata rating ulasan (1–5).
 * Skor loyalitas (1–10) dari Performa Pelanggan dipakai sebagai pembanding & tie-break.
 */
export function satisfactionRanking(testimonials, reviews, customers = []) {
  const names = new Map(customers.map((c) => [c.key, c.name]))
  const map = new Map()
  const get = (row) => {
    const key = customerKey(row)
    if (!map.has(key)) {
      map.set(key, { key, name: row.customer_name?.trim() || names.get(key) || '', phone: row.phone, ratingSum: 0, ratingN: 0, loyaltySum: 0, loyaltyN: 0 })
    }
    const e = map.get(key)
    if (!e.name && row.customer_name?.trim()) e.name = row.customer_name.trim()
    return e
  }
  for (const t of testimonials) {
    const e = get(t)
    e.ratingSum += t.rating
    e.ratingN += 1
  }
  for (const r of reviews) {
    const e = get(r)
    e.loyaltySum += r.loyalty_score
    e.loyaltyN += 1
  }
  return [...map.values()]
    .map((e) => ({
      ...e,
      rating: e.ratingN ? e.ratingSum / e.ratingN : null,
      loyalty: e.loyaltyN ? e.loyaltySum / e.loyaltyN : null,
    }))
    .filter((e) => e.rating !== null || e.loyalty !== null)
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        (b.loyalty ?? 0) - (a.loyalty ?? 0) ||
        b.ratingN + b.loyaltyN - (a.ratingN + a.loyaltyN),
    )
}

export function regionCounts(orders) {
  const map = new Map()
  for (const o of orders) {
    const r = titleCase(o.region || '') || 'Tanpa Region'
    map.set(r, (map.get(r) || 0) + 1)
  }
  return [...map.entries()].map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count)
}

export function countByLevel(orders, levels) {
  const counts = Object.fromEntries(levels.map((l) => [l.value, 0]))
  let other = 0
  for (const o of orders) {
    if (o.level in counts) counts[o.level] += 1
    else other += 1
  }
  const rows = levels.map((l) => ({ level: l.label, value: l.value, count: counts[l.value] }))
  if (other) rows.push({ level: 'Lainnya', value: '_other', count: other })
  return rows
}

export function sentimentCounts(testimonials) {
  const c = { positif: 0, netral: 0, negatif: 0 }
  for (const t of testimonials) c[t.sentiment] = (c[t.sentiment] || 0) + 1
  return c
}

export const testimonialsIn = (list, period) =>
  list.filter((t) => period === 'all' || monthKey(t.review_date) === period)

/** Seri bulanan untuk N bulan terakhir (pendapatan & jumlah order selesai). */
export function monthlySeries(orders, months = 12, end = new Date()) {
  const rows = []
  for (let i = months - 1; i >= 0; i--) {
    const m = addMonths(startOfMonth(end), -i)
    const key = monthKey(m)
    const done = completedIn(orders, key)
    rows.push({
      key,
      label: format(m, 'MMM yy', { locale: localeId }),
      income: sumPrice(done),
      completed: done.length,
      incoming: createdIn(orders, key).length,
    })
  }
  return rows
}

/** Seri harian untuk satu bulan (yyyy-MM). */
export function dailySeries(orders, period = monthKey()) {
  const start = toDate(period + '-01')
  const days = eachDayOfInterval({ start, end: endOfMonth(start) })
  const today = dateKey()
  return days
    .filter((d) => dateKey(d) <= today || monthKey(d) !== monthKey())
    .map((d) => {
      const key = dateKey(d)
      const done = completedOn(orders, key)
      return { key, label: format(d, 'd'), income: sumPrice(done), completed: done.length, incoming: createdOn(orders, key).length }
    })
}

/** Apakah order selesai masih boleh dipulihkan ke On Progress. */
export function restoreInfo(order, settings) {
  const windowDays = settings?.restore_window_days ?? 30
  const done = toDate(order.completed_at)
  if (!done) return { allowed: true, daysLeft: windowDays, override: false }
  const age = (Date.now() - done.getTime()) / 86400000
  const daysLeft = Math.ceil(windowDays - age)
  const withinWindow = age <= windowDays
  return {
    allowed: withinWindow || Boolean(settings?.allow_restore_after_window),
    daysLeft: Math.max(0, daysLeft),
    override: !withinWindow && Boolean(settings?.allow_restore_after_window),
  }
}

export const pctChange = (now, before) => {
  if (!before) return now ? null : 0
  return ((now - before) / before) * 100
}
