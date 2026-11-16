import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ClipboardList, MessageCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Button, Card, EmptyState, FullLoader, Input, PageHeader, Select, Tabs, useConfirm } from '@/components/ui'
import { DeadlineBadge, PaymentBadge, levelLabel } from '@/components/orderBits'
import OrderForm from '@/components/OrderForm'
import { ORDER_STATUSES, ACTIVE_STATUSES } from '@/lib/constants'
import { isActive, sumPrice } from '@/lib/analytics'
import { formatDate, formatRupiah, prettyPhone, waLink } from '@/lib/format'
import { errorMessage } from '@/lib/supabase'

const SORTS = [
  { value: 'deadline', label: 'Deadline terdekat' },
  { value: 'newest', label: 'Terbaru dibuat' },
  { value: 'price', label: 'Harga tertinggi' },
]

function StatusSelect({ order }) {
  const { setOrderStatus } = useData()
  const [busy, setBusy] = useState(false)
  const change = async (e) => {
    const status = e.target.value
    setBusy(true)
    try {
      await setOrderStatus(order.id, status)
      toast.success(
        status === 'selesai' ? `${order.order_no} selesai — dipindahkan ke Riwayat` : `${order.order_no}: ${ORDER_STATUSES.find((s) => s.value === status).label}`,
      )
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return <Select options={ORDER_STATUSES} value={order.status} onChange={change} disabled={busy} className="!py-1.5 text-xs font-semibold" />
}

export default function PurchaseOrder() {
  const { labels: L, levels, settings } = useAuth()
  const { orders, loading, deleteOrder, setOrderStatus } = useData()
  const confirm = useConfirm()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('')
  const [sort, setSort] = useState('deadline')
  const [edit, setEdit] = useState(null)
  const [formOpen, setFormOpen] = useState(false)

  const active = useMemo(() => orders.filter(isActive), [orders])
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    return active
      .filter((o) => tab === 'all' || o.status === tab)
      .filter((o) => !level || o.level === level)
      .filter(
        (o) =>
          !needle ||
          [o.task_name, o.customer_name, o.region, o.order_no, o.notes].some((f) => f?.toLowerCase().includes(needle)) ||
          (digits.length >= 3 && o.phone_norm?.includes(digits.replace(/^0/, ''))),
      )
      .sort((a, b) =>
        sort === 'deadline'
          ? a.deadline.localeCompare(b.deadline)
          : sort === 'price'
            ? Number(b.price) - Number(a.price)
            : b.created_at.localeCompare(a.created_at),
      )
  }, [active, tab, level, q, sort])

  if (loading) return <FullLoader />

  const tabs = [
    { value: 'all', label: 'Semua aktif', count: active.length },
    ...ACTIVE_STATUSES.map((s) => ({
      value: s,
      label: ORDER_STATUSES.find((x) => x.value === s).label,
      count: active.filter((o) => o.status === s).length,
    })),
  ]

  const openNew = () => {
    setEdit(null)
    setFormOpen(true)
  }
  const openEdit = (o) => {
    setEdit(o)
    setFormOpen(true)
  }
  const remove = async (o) => {
    const ok = await confirm({
      title: `Hapus ${o.order_no}?`,
      message: `"${o.task_name}" akan dihapus permanen beserta datanya. Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Hapus',
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
  const finish = async (o) => {
    try {
      await setOrderStatus(o.id, 'selesai')
      toast.success(`${o.order_no} selesai — dipindahkan ke Riwayat`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const Actions = ({ o }) => (
    <div className="flex items-center justify-end gap-0.5">
      {waLink(o.phone) && (
        <a href={waLink(o.phone)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Chat WhatsApp">
          <MessageCircle className="h-4 w-4" />
        </a>
      )}
      <button onClick={() => finish(o)} className="rounded-lg p-2 text-ink-3 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-white/5" title="Tandai selesai">
        <CheckCircle2 className="h-4 w-4" />
      </button>
      <button onClick={() => openEdit(o)} className="rounded-lg p-2 text-ink-3 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/5" title="Edit">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={() => remove(o)} className="rounded-lg p-2 text-ink-3 hover:bg-red-50 hover:text-[#d03b3b] dark:hover:bg-red-500/10" title="Hapus">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <>
      <PageHeader
        title={L.menu_po}
        subtitle={`${active.length} ${L.order.toLowerCase()} aktif · nilai ${formatRupiah(sumPrice(active))}. Order berstatus "Sudah Selesai" otomatis pindah ke Riwayat.`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Tambah {L.menu_po}
          </Button>
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-3" />
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${L.task_name.toLowerCase()}, ${L.customer.toLowerCase()}, no. HP, ${L.region.toLowerCase()}…`} className="pl-9" />
        </div>
        <Select options={levels} placeholder={`Semua ${L.level.toLowerCase()}`} value={level} onChange={(e) => setLevel(e.target.value)} />
        <Select options={SORTS} value={sort} onChange={(e) => setSort(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={active.length ? 'Tidak ada yang cocok dengan filter' : `Belum ada ${L.order.toLowerCase()} aktif`}
            description={active.length ? 'Ubah kata kunci atau filter.' : `Catat ${L.order.toLowerCase()} pertama Anda.`}
            action={!active.length && <Button onClick={openNew}><Plus className="h-4 w-4" /> Tambah</Button>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="scrollbar-thin hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px]">
                <thead className="border-b border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[.02]">
                  <tr>
                    <th className="table-head">No.</th>
                    <th className="table-head">{L.task_name} / {L.customer}</th>
                    <th className="table-head">{L.deadline}</th>
                    <th className="table-head">{L.level}</th>
                    <th className="table-head">{L.region}</th>
                    <th className="table-head text-right">{L.price}</th>
                    <th className="table-head">Bayar</th>
                    <th className="table-head w-48">Status</th>
                    <th className="table-head" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {list.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[.02]">
                      <td className="table-cell num whitespace-nowrap font-semibold text-ink-2 dark:text-[#c3c2b7]">{o.order_no}</td>
                      <td className="table-cell max-w-[260px]">
                        <p className="truncate font-semibold" title={o.task_name}>{o.task_name}</p>
                        <p className="faint truncate text-xs">
                          {o.customer_name ? `${o.customer_name} · ` : ''}
                          {prettyPhone(o.phone)}
                        </p>
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        <p className="text-sm">{formatDate(o.deadline)}</p>
                        <DeadlineBadge order={o} warnDays={settings.deadline_warning_days} />
                      </td>
                      <td className="table-cell whitespace-nowrap">{levelLabel(levels, o.level)}</td>
                      <td className="table-cell">{o.region || '-'}</td>
                      <td className="table-cell num whitespace-nowrap text-right font-semibold">{formatRupiah(o.price)}</td>
                      <td className="table-cell"><PaymentBadge order={o} /></td>
                      <td className="table-cell"><StatusSelect order={o} /></td>
                      <td className="table-cell"><Actions o={o} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 dark:divide-white/5 md:hidden">
              {list.map((o) => (
                <li key={o.id} className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="faint num text-xs font-semibold">{o.order_no} · {levelLabel(levels, o.level)}</p>
                      <p className="font-bold leading-snug">{o.task_name}</p>
                      <p className="faint text-xs">
                        {o.customer_name ? `${o.customer_name} · ` : ''}
                        {prettyPhone(o.phone)}
                        {o.region ? ` · ${o.region}` : ''}
                      </p>
                    </div>
                    <p className="num shrink-0 font-extrabold">{formatRupiah(o.price)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DeadlineBadge order={o} warnDays={settings.deadline_warning_days} />
                    <span className="faint text-xs">{formatDate(o.deadline)}</span>
                    <PaymentBadge order={o} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><StatusSelect order={o} /></div>
                    <Actions o={o} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <OrderForm open={formOpen} onClose={() => setFormOpen(false)} order={edit} />
    </>
  )
}
