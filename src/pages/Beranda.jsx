import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BellRing, CheckCircle2, ClipboardList, Loader, Plus, Star, TrendingUp, Wallet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Badge, Button, Card, CardHeader, EmptyState, FullLoader, StatCard, Tabs } from '@/components/ui'
import { DeadlineBadge, StatusBadge } from '@/components/orderBits'
import { ChartTooltip, Legend, useSeries } from '@/components/charts'
import OrderForm from '@/components/OrderForm'
import { ORDER_STATUSES, ACTIVE_STATUSES } from '@/lib/constants'
import {
  completedIn,
  completedOn,
  createdIn,
  createdOn,
  dailySeries,
  deadlineState,
  isActive,
  isDone,
  pctChange,
  sumPrice,
} from '@/lib/analytics'
import { dateKey, formatCompactRp, formatDate, formatMonth, formatNumber, formatRupiah, monthKey, toDate } from '@/lib/format'
import { addMonths, format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

function Trend({ value }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return <span className="faint">belum ada pembanding</span>
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={up ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#d03b3b]'}>
      <Icon className="-mt-0.5 inline h-3.5 w-3.5" /> {Math.abs(value).toFixed(0)}% vs bulan lalu
    </span>
  )
}

function OrderLine({ o, warn, right }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{o.task_name}</p>
        <p className="faint truncate text-xs">
          {o.order_no} · {o.customer_name || o.phone}
        </p>
      </div>
      {right ?? <DeadlineBadge order={o} warnDays={warn} />}
    </li>
  )
}

export default function Beranda() {
  const { profile, settings, labels: L } = useAuth()
  const { orders, testimonials, loading } = useData()
  const { colors } = useSeries()
  const [tab, setTab] = useState('deadline')
  const [formOpen, setFormOpen] = useState(false)
  const warn = settings.deadline_warning_days

  const m = useMemo(() => {
    const today = dateKey()
    const thisMonth = monthKey()
    const lastMonth = monthKey(addMonths(new Date(), -1))
    const doneMonth = completedIn(orders, thisMonth)
    const doneLast = completedIn(orders, lastMonth)
    const active = orders.filter(isActive)
    const urgent = active
      .filter((o) => ['soon', 'overdue'].includes(deadlineState(o, warn)))
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
    const weekAgo = Date.now() - 7 * 86400000
    return {
      todayIn: createdOn(orders, today).length,
      todayDone: completedOn(orders, today),
      monthIn: createdIn(orders, thisMonth).length,
      doneMonth,
      incomeMonth: sumPrice(doneMonth),
      incomeLast: sumPrice(doneLast),
      active,
      urgent,
      overdue: urgent.filter((o) => deadlineState(o, warn) === 'overdue').length,
      progress: active.filter((o) => o.status === 'on_progress').sort((a, b) => a.deadline.localeCompare(b.deadline)),
      recentDone: orders
        .filter((o) => isDone(o) && toDate(o.completed_at)?.getTime() >= weekAgo)
        .sort((a, b) => b.completed_at.localeCompare(a.completed_at)),
      daily: dailySeries(orders, thisMonth),
      statusDist: ACTIVE_STATUSES.map((s, i) => ({
        name: ORDER_STATUSES.find((x) => x.value === s).label,
        value: active.filter((o) => o.status === s).length,
        color: colors[i],
      })),
    }
  }, [orders, warn, colors])

  if (loading) return <FullLoader text="Memuat data usaha…" />

  const target = Number(settings.monthly_target) || 0
  const targetPct = target ? Math.min(100, (m.incomeMonth / target) * 100) : 0
  const homeReviews = testimonials.filter((t) => t.show_on_home).slice(0, 6)
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'

  const notifTabs = [
    { value: 'deadline', label: 'Hampir Deadline', count: m.urgent.length, icon: AlertTriangle },
    { value: 'progress', label: 'On Progress', count: m.progress.length, icon: Loader },
    { value: 'done', label: 'Terselesaikan', count: m.recentDone.length, icon: CheckCircle2 },
  ]
  const notifList = tab === 'deadline' ? m.urgent : tab === 'progress' ? m.progress : m.recentDone

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="muted text-sm">{format(new Date(), 'EEEE, d MMMM yyyy', { locale: localeId })}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {greet}, {profile?.business_name || `@${profile?.username}`} 👋
          </h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> {L.menu_po} Baru
        </Button>
      </div>

      {m.overdue > 0 && (
        <Link
          to="/purchase-order"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          <BellRing className="h-5 w-5 shrink-0" />
          <span>
            <b>{m.overdue} order</b> sudah melewati deadline dan belum selesai. Tinjau sekarang →
          </span>
        </Link>
      )}

      {/* Capaian harian */}
      <h2 className="faint mb-2 text-xs font-bold uppercase tracking-wider">Capaian hari ini</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Order masuk" value={formatNumber(m.todayIn)} icon={ClipboardList} />
        <StatCard label="Order selesai" value={formatNumber(m.todayDone.length)} icon={CheckCircle2} accent="green" />
        <StatCard label="Pendapatan" value={formatRupiah(sumPrice(m.todayDone))} icon={Wallet} accent="violet" />
        <StatCard
          label="Perlu perhatian"
          value={formatNumber(m.urgent.length)}
          sub={`deadline ≤ ${warn} hari / lewat`}
          icon={AlertTriangle}
          accent={m.urgent.length ? 'red' : 'amber'}
        />
      </div>

      {/* Capaian bulanan */}
      <h2 className="faint mb-2 mt-6 text-xs font-bold uppercase tracking-wider">Capaian {formatMonth(new Date())}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pendapatan bulan ini" value={formatRupiah(m.incomeMonth)} icon={TrendingUp} accent="green">
          <p className="mt-1 text-xs">
            <Trend value={pctChange(m.incomeMonth, m.incomeLast)} />
          </p>
          {target > 0 && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: `${targetPct}%` }} />
              </div>
              <p className="faint mt-1 text-[11px]">
                {targetPct.toFixed(0)}% dari target {formatCompactRp(target)}
              </p>
            </div>
          )}
        </StatCard>
        <StatCard label="Order selesai" value={formatNumber(m.doneMonth.length)} icon={CheckCircle2} sub={`dari ${m.monthIn} order masuk bulan ini`} />
        <StatCard label="Order aktif" value={formatNumber(m.active.length)} icon={Loader} accent="amber" sub="antrian + progress + pelunasan" />
        <StatCard
          label="Rata-rata nilai order"
          value={formatRupiah(m.doneMonth.length ? m.incomeMonth / m.doneMonth.length : 0)}
          icon={Wallet}
          accent="violet"
          sub="order selesai bulan ini"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pendapatan harian" subtitle={`Order selesai per hari · ${formatMonth(new Date())}`} />
          <div className="h-64 px-2 pb-3 pt-4">
            {m.incomeMonth === 0 ? (
              <EmptyState title="Belum ada pendapatan bulan ini" description="Grafik terisi otomatis saat order ditandai Sudah Selesai." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={m.daily} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis tickFormatter={formatCompactRp} tickLine={false} axisLine={false} width={64} />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltip
                        active={active}
                        label={label}
                        labelFormatter={(_, p) => formatDate(p?.[0]?.payload.key, 'EEEE, d MMM')}
                        payload={payload?.length ? [
                          { ...payload[0], name: 'Pendapatan' },
                          { name: 'Order selesai', value: payload[0].payload.completed, color: 'transparent', dataKey: 'c' },
                        ] : []}
                        formatter={(v, n) => (n === 'Pendapatan' ? formatRupiah(v) : v)}
                      />
                    )}
                  />
                  <Bar dataKey="income" fill={colors[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Komposisi order aktif" subtitle={`${m.active.length} order belum selesai`} />
          <div className="flex flex-col items-center px-5 pb-5">
            {m.active.length === 0 ? (
              <EmptyState title="Tidak ada order aktif" />
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={m.statusDist} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" animationDuration={500}>
                        {m.statusDist.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(v) => `${v} order`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 w-full space-y-1.5 text-sm">
                  {m.statusDist.map((d) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                      <span className="muted">{d.name}</span>
                      <span className="num ml-auto font-bold">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Pemberitahuan */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Pemberitahuan"
            subtitle="Pantau order yang perlu ditindaklanjuti"
            action={
              <Link to="/purchase-order" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Lihat semua
              </Link>
            }
          />
          <div className="px-5 pb-4 pt-3">
            <Tabs tabs={notifTabs} value={tab} onChange={setTab} />
            {notifList.length === 0 ? (
              <EmptyState
                title={tab === 'deadline' ? 'Aman, tidak ada yang mepet deadline' : tab === 'progress' ? 'Tidak ada order on progress' : 'Belum ada order selesai 7 hari terakhir'}
              />
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
                {notifList.slice(0, 8).map((o) => (
                  <OrderLine
                    key={o.id}
                    o={o}
                    warn={warn}
                    right={
                      tab === 'done' ? (
                        <Badge tone="green">{formatDate(o.completed_at, 'd MMM')}</Badge>
                      ) : tab === 'progress' ? (
                        <DeadlineBadge order={o} warnDays={warn} />
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <DeadlineBadge order={o} warnDays={warn} />
                          <StatusBadge status={o.status} />
                        </div>
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Berita: ulasan pelanggan */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Kabar dari pelanggan"
            subtitle="Ulasan terbaru dari menu Ulasan"
            action={
              <Link to="/ulasan" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                Kelola
              </Link>
            }
          />
          <div className="px-5 pb-5 pt-3">
            {homeReviews.length === 0 ? (
              <EmptyState icon={Star} title="Belum ada ulasan" description="Tambahkan ulasan pelanggan di menu Ulasan agar tampil di sini." />
            ) : (
              <ul className="space-y-3">
                {homeReviews.map((t) => (
                  <li key={t.id} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold">{t.customer_name}</p>
                      <span className="flex shrink-0 items-center gap-0.5 text-amber-500" aria-label={`${t.rating} dari 5`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className="h-3.5 w-3.5" fill={i < t.rating ? 'currentColor' : 'none'} />
                        ))}
                      </span>
                    </div>
                    <p className="muted mt-1 line-clamp-3 text-sm leading-relaxed">“{t.content}”</p>
                    <p className="faint mt-1.5 text-[11px]">{formatDate(t.review_date)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <OrderForm open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  )
}
