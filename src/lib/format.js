import { format, parseISO, differenceInCalendarDays, isValid } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })
const number = new Intl.NumberFormat('id-ID')

export const formatRupiah = (v) => rupiah.format(Number(v) || 0)
export const formatCompactRp = (v) => 'Rp' + compact.format(Number(v) || 0)
export const formatNumber = (v) => number.format(Number(v) || 0)

/** Terima Date | 'YYYY-MM-DD' | ISO timestamp. 'YYYY-MM-DD' dibaca sebagai tanggal lokal. */
export const toDate = (v) => {
  if (!v) return null
  if (v instanceof Date) return v
  const d = parseISO(v)
  return isValid(d) ? d : null
}

export const formatDate = (v, pattern = 'd MMM yyyy') => {
  const d = toDate(v)
  return d ? format(d, pattern, { locale: localeId }) : '-'
}
export const formatDateTime = (v) => formatDate(v, 'd MMM yyyy, HH:mm')
export const formatMonth = (v) => formatDate(v, 'MMMM yyyy')

export const dateKey = (d = new Date()) => format(toDate(d), 'yyyy-MM-dd')
export const monthKey = (d = new Date()) => format(toDate(d), 'yyyy-MM')

export const daysUntil = (deadline, now = new Date()) => {
  const d = toDate(deadline)
  return d ? differenceInCalendarDays(d, now) : null
}

export const deadlineText = (deadline) => {
  const n = daysUntil(deadline)
  if (n === null) return '-'
  if (n < 0) return `Lewat ${Math.abs(n)} hari`
  if (n === 0) return 'Hari ini'
  if (n === 1) return 'Besok'
  return `${n} hari lagi`
}

/** Tampilan nomor HP: 6281234567890 -> 0812-3456-7890 */
export const prettyPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '')
  if (!d) return '-'
  const local = d.startsWith('62') ? '0' + d.slice(2) : d
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3')
}

export const normalizePhone = (p) => {
  const d = String(p || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0')) return '62' + d.slice(1)
  if (d.startsWith('8')) return '62' + d
  return d
}

export const waLink = (p) => {
  const n = normalizePhone(p)
  return n ? `https://wa.me/${n}` : null
}

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const titleCase = (s = '') =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
