import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { History, Lock, RotateCcw, Search, Trash2, Unlock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { Badge, Card, EmptyState, FullLoader, Input, PageHeader, Select, StatCard, useConfirm } from '@/components/ui'
import { PaymentBadge, levelLabel } from '@/components/orderBits'
import { isDone, restoreInfo, sumPrice } from '@/lib/analytics'
import { formatDate, formatDateTime, formatMonth, formatRupiah, monthKey, prettyPhone } from '@/lib/format'
import { errorMessage } from '@/lib/supabase'

export default function Riwayat() {
  const { openOrder } = useUI()
  const { labels: L, levels, settings } = useAuth()
  const { orders, loading, setOrderStatus, deleteOrder } = useData()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [month, setMonth] = useState('')
  const [busy, setBusy] = useState(null)
  const [limit, setLimit] = useState(40)

  const done = useMemo(
    () => orders.filter(isDone).sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))),
    [orders],
  )
  const months = useMemo(
    () => [...new Set(done.map((o) => monthKey(o.completed_at)))].map((m) => ({ value: m, label: formatMonth(m + '-01') })),
    [done],
  )
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return done
      .filter((o) => !month || monthKey(o.completed_at) === month)
      .filter((o) => !n || [o.task_name, o.customer_name, o.region, o.order_no, o.phone].some((f) => f?.toLowerCase().includes(n)))
  }, [done, q, month])

  if (loading) return <FullLoader />

  const restore = async (o) => {
    const info = restoreInfo(o, settings)
    const ok = await confirm({
      title: `Pulihkan ${o.order_no}?`,
      message: `Status akan dikembalikan ke "On Progress" dan order kembali muncul di menu ${L.menu_po}. Pendapatan order ini dikeluarkan dari laporan sampai ditandai selesai lagi.${info.override ? ' (Batas waktu sudah lewat, tetapi pemulihan diizinkan oleh Pengaturan.)' : ''}`,
      confirmText: 'Pulihkan',
    })
    if (!ok) return
    setBusy(o.id)
    try {
      await setOrderStatus(o.id, 'on_progress')
      toast.success(`${o.order_no} dikembalikan ke ${L.menu_po}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const remove = async (o) => {
    const ok = await confirm({
      title: `Hapus ${o.order_no} dari riwayat?`,
      message: 'Data order dan kontribusinya ke laporan pendapatan akan hilang permanen.',
      confirmText: 'Hapus permanen',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteOrder(o.id)
      toast.success(`${o.order_no} dihapus`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader
        title="Riwayat"
        subtitle={
          <>
            Order yang sudah selesai diproses. Bisa dipulihkan ke On Progress maksimal{' '}
            <b>{settings.restore_window_days} hari</b> setelah selesai
            {settings.allow_restore_after_window ? ' (saat ini pengecualian aktif: semua order bisa dipulihkan)' : ''}.{' '}
            <Link to="/pengaturan/setup" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Ubah aturan
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total order selesai" value={list.length} sub={month ? formatMonth(month + '-01') : 'semua waktu'} />
        <StatCard label="Total pendapatan" value={formatRupiah(sumPrice(list))} accent="green" />
        <StatCard
          label="Masih bisa dipulihkan"
          value={list.filter((o) => restoreInfo(o, settings).allowed).length}
          accent="amber"
          sub={settings.allow_restore_after_window ? 'pengecualian aktif' : `≤ ${settings.restore_window_days} hari`}
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari di riwayat…" className="pl-9" />
        </div>
        <Select options={months} placeholder="Semua bulan" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={History} title="Riwayat masih kosong" description={`Order yang diberi status "Sudah Selesai" di ${L.menu_po} akan muncul di sini.`} />
        ) : (
          <ul className="divide-y divide-line dark:divide-line-dark">
            {list.slice(0, limit).map((o) => {
              const info = restoreInfo(o, settings)
              return (
                <li key={o.id} onClick={(e) => !e.target.closest('button,a') && openOrder(o.id)} className="flex cursor-pointer flex-col gap-3 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center dark:hover:bg-white/[.03]">
                  <div className="min-w-0 flex-1">
                    <p className="faint num text-xs font-semibold">
                      {o.order_no} · {levelLabel(levels, o.level)} {o.region ? `· ${o.region}` : ''}
                      {o.restored_count > 0 && ` · dipulihkan ${o.restored_count}×`}
                    </p>
                    <p className="font-semibold">{o.task_name}</p>
                    <p className="faint text-xs">
                      {o.customer_name ? `${o.customer_name} · ` : ''}
                      {prettyPhone(o.phone)} · deadline {formatDate(o.deadline)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="num font-extrabold">{formatRupiah(o.price)}</p>
                      <p className="faint text-[11px]">Selesai {formatDateTime(o.completed_at)}</p>
                    </div>
                    <PaymentBadge order={o} />
                    {info.allowed ? (
                      <button
                        onClick={() => restore(o)}
                        disabled={busy === o.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
                        title={info.override ? 'Batas lewat, diizinkan oleh pengaturan' : `Sisa ${info.daysLeft} hari untuk memulihkan`}
                      >
                        {info.override ? <Unlock className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        Pulihkan
                        {!info.override && <span className="faint num">({info.daysLeft} hr)</span>}
                      </button>
                    ) : (
                      <Badge tone="slate" icon={Lock}>Terkunci permanen</Badge>
                    )}
                    <button onClick={() => remove(o)} className="rounded-lg p-2 text-ink-3 hover:bg-red-50 hover:text-[#d03b3b] dark:hover:bg-red-500/10" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {list.length > limit && (
          <div className="border-t border-slate-100 p-3 text-center dark:border-white/5">
            <button onClick={() => setLimit((l) => l + 40)} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Tampilkan lebih banyak ({list.length - limit} lagi)
            </button>
          </div>
        )}
      </Card>
    </>
  )
}
