import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Frown, MapPin, Repeat, Smile, Trophy, Wallet } from 'lucide-react'
import { addMonths } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Badge, Card, CardHeader, EmptyState, FullLoader, PageHeader, Select, StatCard } from '@/components/ui'
import { ChartTooltip, RankBars, useSeries } from '@/components/charts'
import { COMPLAINTS, STATUS_COLORS } from '@/lib/constants'
import {
  completedIn,
  countByLevel,
  createdIn,
  customersFromOrders,
  monthlySeries,
  regionCounts,
  repeatCustomers,
  satisfactionRanking,
  sentimentCounts,
  sumPrice,
  testimonialsIn,
} from '@/lib/analytics'
import { formatCompactRp, formatMonth, formatNumber, formatRupiah, monthKey, prettyPhone } from '@/lib/format'

function ChartBox({ children, empty, emptyText = 'Belum ada data pada periode ini', h = 'h-60' }) {
  return <div className={`${h} px-2 pb-3 pt-4`}>{empty ? <EmptyState title={emptyText} /> : <ResponsiveContainer>{children}</ResponsiveContainer>}</div>
}

export default function Dashboard() {
  const { labels: L, levels } = useAuth()
  const { orders, reviews, testimonials, loading } = useData()
  const { colors, dark } = useSeries()
  const [period, setPeriod] = useState(monthKey())

  const periods = useMemo(() => {
    const list = Array.from({ length: 12 }, (_, i) => {
      const k = monthKey(addMonths(new Date(), -i))
      return { value: k, label: formatMonth(k + '-01') }
    })
    return [...list, { value: 'all', label: 'Semua waktu' }]
  }, [])

  const d = useMemo(() => {
    const done = completedIn(orders, period)
    const testi = testimonialsIn(testimonials, period)
    const revs = period === 'all' ? reviews : reviews.filter((r) => monthKey(r.created_at) === period)
    const complaintRows = COMPLAINTS.map((c) => ({ label: c.label, count: revs.filter((r) => r.complaints.includes(c.value)).length }))
    const customers = customersFromOrders(orders)
    return {
      done,
      income: sumPrice(done),
      incoming: createdIn(orders, period).length,
      sentiment: sentimentCounts(testi),
      testiCount: testi.length,
      byLevel: countByLevel(done, levels),
      regions: regionCounts(createdIn(orders, period)).slice(0, 8),
      repeat: repeatCustomers(orders).slice(0, 10),
      satisfaction: satisfactionRanking(testimonials, reviews, customers).slice(0, 10),
      complaints: complaintRows,
      complaintTotal: revs.filter((r) => r.complaints.length).length,
      trend: monthlySeries(orders, 12),
    }
  }, [orders, reviews, testimonials, period, levels])

  if (loading) return <FullLoader />

  const neutral = dark ? '#8f8e88' : '#b5b4ae'
  const sentimentData = [
    { name: 'Positif', value: d.sentiment.positif, color: STATUS_COLORS.good },
    { name: 'Netral', value: d.sentiment.netral, color: neutral },
    { name: 'Negatif', value: d.sentiment.negatif, color: STATUS_COLORS.critical },
  ]
  const periodLabel = period === 'all' ? 'semua waktu' : formatMonth(period + '-01')

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Laporan gabungan dari ${L.menu_po}, Riwayat, Ulasan, dan Performa ${L.customer}.`}
        action={
          <div className="w-52">
            <Select options={periods} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode" />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Order diselesaikan" value={formatNumber(d.done.length)} sub={`${d.incoming} order masuk`} icon={CheckCircle2} />
        <StatCard label="Penghasilan" value={formatRupiah(d.income)} sub="dari order selesai" icon={Wallet} accent="green" />
        <StatCard label="Ulasan positif" value={d.sentiment.positif} sub={`dari ${d.testiCount} ulasan`} icon={Smile} accent="green" />
        <StatCard label="Ulasan negatif" value={d.sentiment.negatif} sub={`${d.complaintTotal} penilaian berkeluhan`} icon={Frown} accent="red" />
        <StatCard label={`${L.customer} repeat order`} value={d.repeat.length} sub="≥ 2 order (semua waktu)" icon={Repeat} accent="violet" />
      </div>

      {/* Tren 12 bulan: dua grafik terpisah (bukan sumbu ganda) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Penghasilan per bulan" subtitle="12 bulan terakhir · order selesai" />
          <ChartBox empty={!d.trend.some((r) => r.income)}>
            <BarChart data={d.trend} margin={{ right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatCompactRp} tickLine={false} axisLine={false} width={64} />
              <Tooltip content={<ChartTooltip formatter={(v) => formatRupiah(v)} />} />
              <Bar dataKey="income" name="Penghasilan" fill={colors[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartBox>
        </Card>
        <Card>
          <CardHeader title="Order diselesaikan per bulan" subtitle="12 bulan terakhir" />
          <ChartBox empty={!d.trend.some((r) => r.completed)}>
            <BarChart data={d.trend} margin={{ right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip formatter={(v) => `${v} order`} />} />
              <Bar dataKey="completed" name="Selesai" fill={colors[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartBox>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Sentimen ulasan" subtitle={`Komplain positif vs negatif · ${periodLabel}`} />
          <div className="px-5 pb-5">
            {d.testiCount === 0 ? (
              <EmptyState title="Belum ada ulasan" />
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="92%" paddingAngle={2} stroke="none" animationDuration={500}>
                        {sentimentData.map((s) => <Cell key={s.name} fill={s.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(v) => `${v} ulasan`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {sentimentData.map((s) => (
                    <li key={s.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                      <span className="muted">{s.name}</span>
                      <span className="num ml-auto font-bold">{s.value}</span>
                      <span className="faint num w-10 text-right text-xs">{((s.value / d.testiCount) * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={`Selesai per ${L.level.toLowerCase()}`} subtitle={periodLabel} />
          <ChartBox empty={!d.done.length}>
            <BarChart data={d.byLevel} margin={{ right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="level" tickLine={false} axisLine={false} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip formatter={(v) => `${v} order`} />} />
              <Bar dataKey="count" name="Order selesai" fill={colors[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartBox>
        </Card>

        <Card>
          <CardHeader title={`${L.region} dengan order terbanyak`} subtitle={`Order masuk · ${periodLabel}`} action={<MapPin className="h-4 w-4 text-ink-3" />} />
          <div className="px-5 pb-5 pt-4">
            {d.regions.length === 0 ? <EmptyState title="Belum ada data" /> : <RankBars rows={d.regions} labelKey="region" color={colors[0]} format={(v) => `${v} order`} />}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title={`${L.customer} yang selalu repeat order`} subtitle="Diurutkan dari jumlah order terbanyak (semua waktu)" action={<Repeat className="h-4 w-4 text-ink-3" />} />
          {d.repeat.length === 0 ? (
            <EmptyState title="Belum ada repeat order" description="Pelanggan dikenali dari nomor HP yang sama." />
          ) : (
            <div className="scrollbar-thin mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead className="border-y border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="table-head">#</th>
                    <th className="table-head">{L.customer}</th>
                    <th className="table-head text-right">Order</th>
                    <th className="table-head text-right">Total belanja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {d.repeat.map((c, i) => (
                    <tr key={c.key}>
                      <td className="table-cell num faint">{i + 1}</td>
                      <td className="table-cell">
                        <p className="font-semibold">{c.name || '(tanpa nama)'}</p>
                        <p className="faint text-xs">{prettyPhone(c.phone)}</p>
                      </td>
                      <td className="table-cell num text-right font-bold">{c.orders}×</td>
                      <td className="table-cell num text-right">{formatRupiah(c.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Kepuasan tertinggi" subtitle="Rata-rata rating ulasan (1–5); skor loyalitas sebagai pembanding" action={<Trophy className="h-4 w-4 text-ink-3" />} />
          {d.satisfaction.length === 0 ? (
            <EmptyState title="Belum ada ulasan / penilaian" />
          ) : (
            <div className="scrollbar-thin mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead className="border-y border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="table-head">#</th>
                    <th className="table-head">{L.customer}</th>
                    <th className="table-head text-right">Rating</th>
                    <th className="table-head text-right">Loyalitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {d.satisfaction.map((c, i) => (
                    <tr key={c.key}>
                      <td className="table-cell num faint">{i + 1}</td>
                      <td className="table-cell">
                        <p className="font-semibold">{c.name || '(tanpa nama)'}</p>
                        <p className="faint text-xs">{c.phone ? prettyPhone(c.phone) : '-'}</p>
                      </td>
                      <td className="table-cell num text-right">
                        {c.rating !== null ? <><b>{c.rating.toFixed(1)}</b> <span className="faint text-xs">({c.ratingN})</span></> : <span className="faint">-</span>}
                      </td>
                      <td className="table-cell text-right">
                        {c.loyalty !== null ? <Badge tone={c.loyalty >= 8 ? 'green' : c.loyalty >= 5 ? 'amber' : 'red'} className="num">{c.loyalty.toFixed(1)}/10</Badge> : <span className="faint">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Jenis keluhan pelanggan" subtitle={`Dari Performa ${L.customer} · ${periodLabel}`} />
        <div className="px-5 pb-5 pt-4">
          {d.complaints.every((c) => !c.count) ? (
            <EmptyState title="Tidak ada keluhan tercatat" />
          ) : (
            <RankBars rows={[...d.complaints].sort((a, b) => b.count - a.count)} color={colors[1]} format={(v) => `${v}×`} />
          )}
        </div>
      </Card>
    </>
  )
}
