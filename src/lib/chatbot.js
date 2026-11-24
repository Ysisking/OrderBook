// =====================================================================
// Chatbot Data Analyst (sementara, berbasis aturan — BUKAN AI).
// Setiap jawaban dihitung langsung dari data pengguna dan menyebut
// definisi/rumusnya, supaya angka bisa dicek ulang.
//
// Bentuk jawaban:
// { lines: string[], stats?: [{label, value, tone?}], rows?: [{label, value, sub?, pct?, tone?}],
//   rowsTitle?: string, quote?: {text, by}, note?: string, verdict?: {text, tone} }
// =====================================================================
import { addMonths, differenceInCalendarDays, endOfMonth, getDate, getDaysInMonth } from 'date-fns'
import { completedIn, isActive, pctChange, sumPrice, testimonialsIn, deadlineState } from './analytics'
import { formatDate, formatMonth, formatRupiah, monthKey, toDate } from './format'

export const QUESTIONS = [
  { id: 'kinerja', text: 'Performa kinerja bulan ini bagaimana?' },
  { id: 'perspektif', text: 'Bagaimana perspektif pelanggan terhadap kinerja?' },
  { id: 'revenue', text: 'Berapa revenue bulan ini?' },
  { id: 'kenaikan', text: 'Bagaimana kenaikan penghasilan bulan ini?' },
]

const pct = (a, b) => (b ? (a / b) * 100 : 0)
const fmtPct = (v) => `${v.toFixed(v % 1 === 0 ? 0 : 1).replace('.', ',')}%`
const fmtChange = (v) => (v === null ? 'baru (sebelumnya Rp0)' : `${v >= 0 ? '+' : '−'}${fmtPct(Math.abs(v))}`)
const monthName = (period) => formatMonth(toDate(period + '-01'))
const prevPeriod = (period) => monthKey(addMonths(toDate(period + '-01'), -1))
const isCurrent = (period) => period === monthKey()

/** Hari-ke berapa (tanggal lokal) order diselesaikan relatif terhadap deadline. +n = n hari sebelum deadline. */
export const leadDays = (o) => {
  const dl = toDate(o.deadline)
  const done = toDate(o.completed_at)
  return dl && done ? differenceInCalendarDays(dl, done) : null
}

// ---------------------------------------------------------------- 1. Kinerja
export function answerKinerja({ orders, period, settings, L }) {
  const done = completedIn(orders, period).filter((o) => leadDays(o) !== null)
  const name = monthName(period)
  const lines = []
  if (!done.length) {
    lines.push(`Belum ada ${L.order.toLowerCase()} yang diselesaikan pada ${name}, jadi performa ketepatan waktu belum bisa dihitung.`)
    const active = orders.filter(isActive).length
    if (isCurrent(period) && active) lines.push(`Saat ini ada ${active} ${L.order.toLowerCase()} aktif yang sedang berjalan.`)
    return { lines }
  }
  const early = done.filter((o) => leadDays(o) >= 1)
  const onDay = done.filter((o) => leadDays(o) === 0)
  const late = done.filter((o) => leadDays(o) < 0)
  const pEarly = pct(early.length, done.length)
  const pOnDay = pct(onDay.length, done.length)
  const pLate = pct(late.length, done.length)
  const avgLead = done.reduce((s, o) => s + leadDays(o), 0) / done.length

  lines.push(
    `Pada ${name} ada ${done.length} ${L.order.toLowerCase()} selesai. ${early.length} di antaranya (${fmtPct(pEarly)}) diselesaikan paling lambat H-1, yaitu minimal 1 hari sebelum ${L.deadline.toLowerCase()}.`,
  )
  if (late.length) {
    const worst = Math.min(...late.map(leadDays))
    lines.push(`${late.length} ${L.order.toLowerCase()} (${fmtPct(pLate)}) terlambat, paling lama ${Math.abs(worst)} hari setelah deadline.`)
  } else {
    lines.push('Tidak ada yang terlambat dari deadline.')
  }
  lines.push(
    `Rata-rata, pekerjaan selesai ${Math.abs(avgLead).toFixed(1).replace('.', ',')} hari ${avgLead >= 0 ? 'sebelum' : 'setelah'} deadline.`,
  )

  let verdict
  if (pEarly >= 80 && !late.length) verdict = { text: 'Sangat baik: hampir semua pekerjaan selesai lebih awal.', tone: 'green' }
  else if (pEarly >= 60 && pLate <= 10) verdict = { text: 'Baik: mayoritas selesai lebih awal, pertahankan ritmenya.', tone: 'green' }
  else if (pLate <= 20) verdict = { text: 'Cukup: banyak pekerjaan baru selesai mepet hari deadline.', tone: 'amber' }
  else verdict = { text: 'Perlu perbaikan: porsi keterlambatan di atas 20%.', tone: 'red' }

  if (isCurrent(period)) {
    const overdue = orders.filter(isActive).filter((o) => deadlineState(o, settings?.deadline_warning_days) === 'overdue')
    if (overdue.length) lines.push(`Perhatian: ${overdue.length} ${L.order.toLowerCase()} aktif sudah melewati deadline dan belum selesai.`)
  }

  return {
    lines,
    verdict,
    rowsTitle: 'Sebaran waktu penyelesaian',
    rows: [
      { label: 'Paling lambat H-1', value: `${early.length} order`, pct: pEarly, sub: fmtPct(pEarly), tone: 'good' },
      { label: 'Tepat di hari deadline', value: `${onDay.length} order`, pct: pOnDay, sub: fmtPct(pOnDay), tone: 'neutral' },
      { label: 'Terlambat', value: `${late.length} order`, pct: pLate, sub: fmtPct(pLate), tone: 'bad' },
    ],
    note: 'Tanggal selesai = saat status diubah menjadi "Sudah Selesai". Penilaian memakai ambang aturan (≥80% H-1 tanpa keterlambatan = sangat baik).',
  }
}

// ---------------------------------------------------------------- 2. Perspektif pelanggan
export function answerPerspektif({ testimonials, period }) {
  const all = testimonials
  if (!all.length) {
    return {
      lines: [
        'Belum ada ulasan pelanggan yang tercatat, jadi perspektif pelanggan belum bisa dihitung.',
        'Tambahkan ulasan di menu Ulasan. Setiap ulasan berisi rating 1–5 dan sentimen.',
      ],
    }
  }
  const n = all.length
  const avg = all.reduce((s, t) => s + t.rating, 0) / n
  const sent = { positif: 0, netral: 0, negatif: 0 }
  for (const t of all) sent[t.sentiment] = (sent[t.sentiment] || 0) + 1
  const pPos = pct(sent.positif, n)
  const pNeg = pct(sent.negatif, n)

  const lines = [
    `Dari ${n} ulasan pelanggan, rata-rata rating ${avg.toFixed(2).replace('.', ',')} dari 5. ${sent.positif} ulasan (${fmtPct(pPos)}) positif, ${sent.netral} netral, dan ${sent.negatif} (${fmtPct(pNeg)}) negatif.`,
  ]

  const cur = testimonialsIn(all, period)
  const prev = testimonialsIn(all, prevPeriod(period))
  if (cur.length) {
    const avgCur = cur.reduce((s, t) => s + t.rating, 0) / cur.length
    let cmp = ''
    if (prev.length) {
      const avgPrev = prev.reduce((s, t) => s + t.rating, 0) / prev.length
      const d = avgCur - avgPrev
      cmp = Math.abs(d) < 0.05 ? ', stabil dibanding bulan sebelumnya' : `, ${d > 0 ? 'naik' : 'turun'} ${Math.abs(d).toFixed(2).replace('.', ',')} poin dari bulan sebelumnya (${avgPrev.toFixed(2).replace('.', ',')})`
    }
    lines.push(`Khusus ${monthName(period)}: ${cur.length} ulasan dengan rata-rata ${avgCur.toFixed(2).replace('.', ',')}${cmp}.`)
  } else {
    lines.push(`Belum ada ulasan baru di ${monthName(period)}.`)
  }

  let verdict
  if (avg >= 4.5 && pNeg <= 5) verdict = { text: 'Pelanggan sangat puas dengan kinerja Anda.', tone: 'green' }
  else if (avg >= 4) verdict = { text: 'Pelanggan umumnya puas.', tone: 'green' }
  else if (avg >= 3) verdict = { text: 'Kepuasan pelanggan cukup, tapi ada ruang perbaikan.', tone: 'amber' }
  else verdict = { text: 'Kepuasan pelanggan rendah. Telusuri ulasan negatif.', tone: 'red' }

  const sorted = [...all].sort((a, b) => String(b.review_date).localeCompare(String(a.review_date)))
  const latestNeg = sorted.find((t) => t.sentiment === 'negatif')
  const latestPos = sorted.find((t) => t.sentiment === 'positif')
  const pick = latestNeg || latestPos
  const quote = pick && {
    text: pick.content.length > 160 ? pick.content.slice(0, 157) + '…' : pick.content,
    by: `${pick.customer_name} · ${pick.rating}★ · ${formatDate(pick.review_date)}${latestNeg ? ' (ulasan negatif terbaru)' : ''}`,
  }

  const dist = [5, 4, 3, 2, 1].map((r) => {
    const c = all.filter((t) => t.rating === r).length
    return { label: `${r} bintang`, value: `${c}`, pct: pct(c, n), sub: fmtPct(pct(c, n)), tone: r >= 4 ? 'good' : r === 3 ? 'neutral' : 'bad' }
  })

  return {
    lines,
    verdict,
    rowsTitle: 'Sebaran rating',
    rows: dist,
    quote,
    note: n < 5 ? `Sampel masih kecil (${n} ulasan), jadi kesimpulan bisa berubah cepat.` : 'Dihitung dari seluruh ulasan di menu Ulasan.',
  }
}

// ---------------------------------------------------------------- 3. Revenue
export function answerRevenue({ orders, period, L }) {
  const done = completedIn(orders, period)
  const rev = sumPrice(done)
  const prev = sumPrice(completedIn(orders, prevPeriod(period)))
  const name = monthName(period)
  const lines = []
  if (!done.length) {
    lines.push(`Revenue ${name}: Rp0. Belum ada ${L.order.toLowerCase()} yang selesai di bulan tersebut.`)
  } else {
    lines.push(
      `Revenue ${name} sebesar ${formatRupiah(rev)}, dari ${done.length} ${L.order.toLowerCase()} selesai. Rata-rata ${formatRupiah(rev / done.length)} per ${L.order.toLowerCase()}.`,
    )
  }
  if (prev || rev) {
    const ch = pctChange(rev, prev)
    lines.push(`Dibanding bulan sebelumnya (${formatRupiah(prev)}): ${fmtChange(ch)}.`)
  }
  if (isCurrent(period)) {
    const pipe = orders.filter(isActive)
    if (pipe.length) lines.push(`Masih ada ${pipe.length} ${L.order.toLowerCase()} aktif senilai ${formatRupiah(sumPrice(pipe))}. Nilai ini belum dihitung sebagai revenue sampai statusnya "Sudah Selesai".`)
  }
  return {
    lines,
    stats: [
      { label: 'Revenue', value: formatRupiah(rev) },
      { label: `${L.order} selesai`, value: String(done.length) },
      { label: 'Bulan sebelumnya', value: formatRupiah(prev) },
    ],
    note: 'Revenue = total harga order yang selesai pada bulan tersebut. Ini pendapatan kotor (omzet): belum dikurangi biaya tetap, biaya variabel, dan overhead karena fitur biaya belum tersedia.',
  }
}

// ---------------------------------------------------------------- 4. Kenaikan per minggu
/** Bagi bulan menjadi blok 7 hari: 1–7, 8–14, 15–21, 22–28, 29–akhir. */
export function weeklyIncome(orders, period, today = new Date()) {
  const start = toDate(period + '-01')
  const last = getDaysInMonth(start)
  const done = completedIn(orders, period)
  const current = isCurrent(period)
  const todayDay = getDate(today)
  const weeks = []
  for (let from = 1, i = 1; from <= last; from += 7, i++) {
    const to = Math.min(from + 6, last)
    if (current && from > todayDay) break
    const list = done.filter((o) => {
      const d = getDate(toDate(o.completed_at))
      return d >= from && d <= to
    })
    weeks.push({
      week: i,
      from,
      to,
      days: to - from + 1,
      income: sumPrice(list),
      count: list.length,
      running: current && todayDay <= to,
    })
  }
  return weeks
}

export function answerKenaikan({ orders, period }) {
  const name = monthName(period)
  const start = toDate(period + '-01')
  const mon = formatDate(start, 'MMM')
  const weeks = weeklyIncome(orders, period)
  const total = weeks.reduce((s, w) => s + w.income, 0)
  if (!total) {
    return { lines: [`Belum ada penghasilan dari order selesai di ${name}, jadi naik-turun per minggu belum bisa dihitung.`] }
  }
  const rows = weeks.map((w, i) => {
    const prev = weeks[i - 1]
    const ch = prev ? pctChange(w.income, prev.income) : undefined
    const tags = [w.running ? 'berjalan' : null, w.days < 7 ? `${w.days} hari` : null].filter(Boolean).join(', ')
    return {
      label: `Minggu ${w.week} (${w.from}–${w.to} ${mon})${tags ? ` · ${tags}` : ''}`,
      value: formatRupiah(w.income),
      sub: ch === undefined ? 'awal bulan' : ch === null ? 'naik dari Rp0' : fmtChange(ch),
      tone: ch === undefined ? 'neutral' : ch === null || ch > 0 ? 'good' : ch < 0 ? 'bad' : 'neutral',
      pct: 0,
    }
  })
  const max = Math.max(...weeks.map((w) => w.income)) || 1
  rows.forEach((r, i) => (r.pct = (weeks[i].income / max) * 100))

  const lines = []
  // Bandingkan dua minggu penuh (7 hari, tidak sedang berjalan) terakhir
  const full = weeks.filter((w) => w.days === 7 && !w.running)
  if (full.length >= 2) {
    const [a, b] = full.slice(-2)
    const ch = pctChange(b.income, a.income)
    const dir = ch === null ? 'naik dari Rp0' : ch > 0 ? `naik ${fmtPct(ch)}` : ch < 0 ? `turun ${fmtPct(Math.abs(ch))}` : 'sama'
    lines.push(`Minggu penuh terakhir (minggu ${b.week}) menghasilkan ${formatRupiah(b.income)}, ${dir} dibanding minggu ${a.week} (${formatRupiah(a.income)}).`)
  } else if (full.length === 1) {
    lines.push(`Baru ada satu minggu penuh (minggu ${full[0].week}: ${formatRupiah(full[0].income)}), jadi tren mingguan belum bisa dibandingkan.`)
  }
  const ups = rows.filter((r, i) => i > 0 && r.tone === 'good').length
  const downs = rows.filter((r, i) => i > 0 && r.tone === 'bad').length
  const best = weeks.reduce((a, b) => (b.income > a.income ? b : a))
  lines.push(`Dari ${weeks.length} minggu di ${name}: ${ups} kali naik, ${downs} kali turun. Minggu terbaik adalah minggu ${best.week} (${formatRupiah(best.income)}).`)

  let verdict
  const running = weeks.find((w) => w.running)
  if (isCurrent(period)) {
    // Bulan berjalan: bandingkan dengan periode yang sama bulan lalu (tgl 1 s.d. hari ini).
    const day = getDate(new Date())
    const prevStart = toDate(prevPeriod(period) + '-01')
    const cap = Math.min(day, getDate(endOfMonth(prevStart)))
    const prevSame = sumPrice(
      completedIn(orders, prevPeriod(period)).filter((o) => getDate(toDate(o.completed_at)) <= cap),
    )
    const ch = pctChange(total, prevSame)
    lines.push(`Total tanggal 1–${day} ${mon}: ${formatRupiah(total)}, ${fmtChange(ch)} dibanding periode yang sama bulan lalu (${formatRupiah(prevSame)}).`)
    if (running) lines.push(`Minggu ${running.week} masih berjalan, jadi angkanya belum final.`)
    const monthUp = ch === null || ch > 5
    const monthDown = ch !== null && ch < -5
    // Sinyal jangka pendek: perubahan antar dua minggu penuh terakhir
    const lastFull = full.length >= 2 ? pctChange(full.at(-1).income, full.at(-2).income) : undefined
    const weekDown = lastFull !== undefined && lastFull !== null && lastFull < -5
    const weekUp = lastFull === null || (lastFull !== undefined && lastFull > 5)
    if (monthUp && !weekDown) verdict = { text: 'Naik: total bulan ini di atas periode yang sama bulan lalu.', tone: 'green' }
    else if (monthUp && weekDown) verdict = { text: 'Total masih naik dibanding bulan lalu, tapi minggu terakhir melemah.', tone: 'amber' }
    else if (monthDown && weekUp) verdict = { text: 'Total masih di bawah bulan lalu, tapi minggu terakhir mulai membaik.', tone: 'amber' }
    else if (monthDown) verdict = { text: 'Turun: total bulan ini di bawah periode yang sama bulan lalu.', tone: 'red' }
    else verdict = { text: 'Relatif stabil dibanding bulan lalu.', tone: 'amber' }
  } else {
    verdict = ups > downs ? { text: 'Cenderung naik sepanjang bulan.', tone: 'green' } : downs > ups ? { text: 'Cenderung turun sepanjang bulan.', tone: 'red' } : { text: 'Naik-turun berimbang.', tone: 'amber' }
  }

  return {
    lines,
    verdict,
    rowsTitle: 'Penghasilan per minggu',
    rows,
    note: 'Minggu dihitung per blok 7 hari kalender (1–7, 8–14, dst). Minggu terakhir yang kurang dari 7 hari tidak sebanding langsung dengan minggu penuh.',
  }
}

// ---------------------------------------------------------------- Router
const ANSWERS = { kinerja: answerKinerja, perspektif: answerPerspektif, revenue: answerRevenue, kenaikan: answerKenaikan }

export function answer(id, ctx) {
  const fn = ANSWERS[id]
  return fn ? fn(ctx) : null
}

/** Cocokkan teks bebas ke salah satu pertanyaan yang tersedia. */
export function matchQuestion(text) {
  const t = text.toLowerCase()
  if (/kenaikan|naik|turun|minggu|tren|trend|pertumbuhan|grafik/.test(t)) return 'kenaikan'
  if (/deadline|tenggat|tanggat|kinerja|performa|tepat waktu|terlambat|telat/.test(t)) return 'kinerja'
  if (/ulasan|perspektif|kepuasan|puas|rating|review|testimoni|bintang|pendapat/.test(t)) return 'perspektif'
  if (/revenue|omzet|omset|pendapatan|penghasilan|pemasukan|uang|income/.test(t)) return 'revenue'
  return null
}

/** "bulan lalu" di teks bebas -> periode bulan sebelumnya. */
export const periodFromText = (text, fallback) => (/bulan (lalu|kemarin|sebelumnya)/i.test(text) ? prevPeriod(monthKey()) : fallback)
