import { useMemo } from 'react'
import { Bot, Lightbulb, Sparkles } from 'lucide-react'
import { addMonths } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Badge, Card, CardHeader, FullLoader, PageHeader } from '@/components/ui'
import { completedIn, countByLevel, deadlineState, isActive, pctChange, regionCounts, repeatCustomers, sentimentCounts, sumPrice } from '@/lib/analytics'
import { formatMonth, formatRupiah, monthKey } from '@/lib/format'

/** Insight berbasis aturan (sementara, sebelum modul AI dibangun). Tiap insight menyebut angka sumbernya. */
function useInsights() {
  const { orders, testimonials } = useData()
  const { levels, settings, labels: L } = useAuth()
  return useMemo(() => {
    const out = []
    const now = monthKey()
    const prev = monthKey(addMonths(new Date(), -1))
    const inc = sumPrice(completedIn(orders, now))
    const incPrev = sumPrice(completedIn(orders, prev))
    const ch = pctChange(inc, incPrev)
    if (incPrev > 0)
      out.push(`Penghasilan ${formatMonth(new Date())} ${formatRupiah(inc)}, ${ch >= 0 ? 'naik' : 'turun'} ${Math.abs(ch).toFixed(0)}% dibanding bulan lalu (${formatRupiah(incPrev)}).`)
    const overdue = orders.filter(isActive).filter((o) => deadlineState(o, settings.deadline_warning_days) === 'overdue')
    if (overdue.length) out.push(`${overdue.length} order aktif sudah melewati deadline — risiko keluhan meningkat.`)
    const reg = regionCounts(orders)
    if (reg.length && reg[0].region !== 'Tanpa Region' && orders.length >= 5)
      out.push(`${L.region} ${reg[0].region} menyumbang ${((reg[0].count / orders.length) * 100).toFixed(0)}% dari seluruh order.`)
    const lv = countByLevel(completedIn(orders, 'all'), levels).sort((a, b) => b.count - a.count)
    if (lv[0]?.count) out.push(`${L.level} paling sering diselesaikan: ${lv[0].level} (${lv[0].count} order).`)
    const rep = repeatCustomers(orders)
    const cust = new Set(orders.map((o) => o.phone_norm)).size
    if (cust >= 3) out.push(`${rep.length} dari ${cust} ${L.customer.toLowerCase()} (${((rep.length / cust) * 100).toFixed(0)}%) melakukan repeat order.`)
    const s = sentimentCounts(testimonials)
    if (testimonials.length >= 3) out.push(`${((s.positif / testimonials.length) * 100).toFixed(0)}% ulasan bersentimen positif, ${s.negatif} negatif.`)
    return out
  }, [orders, testimonials, levels, settings, L])
}

export default function DataAnalyst() {
  const { loading } = useData()
  const insights = useInsights()
  if (loading) return <FullLoader />
  return (
    <>
      <PageHeader title="Data Analyst" subtitle="Asisten AI yang membaca data usaha Anda dan menjawab pertanyaan analitis." action={<Badge tone="violet" icon={Sparkles}>Segera hadir</Badge>} />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Insight otomatis (sementara)" subtitle="Dihitung dengan aturan sederhana dari data Anda — bukan AI." action={<Lightbulb className="h-4 w-4 text-ink-3" />} />
          <div className="px-5 pb-5 pt-3">
            {insights.length === 0 ? (
              <p className="muted text-sm">Data belum cukup. Insight muncul setelah ada beberapa order selesai dan ulasan.</p>
            ) : (
              <ul className="space-y-2.5">
                {insights.map((t) => (
                  <li key={t} className="flex gap-2.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Rencana modul AI" action={<Bot className="h-4 w-4 text-ink-3" />} />
          <ul className="muted list-inside list-disc space-y-1.5 px-5 pb-5 pt-3 text-sm">
            <li>Tanya-jawab bebas: “Region mana yang paling menguntungkan 3 bulan terakhir?”</li>
            <li>Ringkasan performa mingguan/bulanan otomatis</li>
            <li>Prediksi beban kerja & pendapatan bulan depan</li>
            <li>Rekomendasi harga per level dan segmentasi pelanggan</li>
          </ul>
          <p className="faint px-5 pb-5 text-xs">Modul ini akan dibahas dan dibangun pada tahap berikutnya (butuh API key model AI di sisi server).</p>
        </Card>
      </div>
    </>
  )
}
