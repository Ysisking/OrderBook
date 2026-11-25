import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Columns3,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { Button, Card, Checkbox, EmptyState, FullLoader, Kbd, Menu, PageHeader, Select, TONE_DOTS, Tabs, clsx } from '@/components/ui'
import { DeadlineText, PaymentBadge, StatusMenu, levelLabel, nextStatus, statusOf, useOrderActions } from '@/components/orderBits'
import { ORDER_STATUSES, ACTIVE_STATUSES } from '@/lib/constants'
import { deadlineState, isActive, sumPrice } from '@/lib/analytics'
import { formatDate, formatRupiah, prettyPhone, waLink } from '@/lib/format'

const SORTS = [
  { value: 'deadline', label: 'Urut: deadline terdekat' },
  { value: 'newest', label: 'Urut: terbaru dibuat' },
  { value: 'price', label: 'Urut: harga tertinggi' },
]
const VIEW_KEY = 'ob-po-view'
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) || 'table'
  } catch {
    return 'table'
  }
}

export default function PurchaseOrder() {
  const { labels: L, levels, settings } = useAuth()
  const { orders, loading } = useData()
  const ui = useUI()
  const [view, setView] = useState(readView)
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('')
  const [sort, setSort] = useState('deadline')
  const [selected, setSelected] = useState(() => new Set())
  const warn = settings.deadline_warning_days

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* abaikan */
    }
  }, [view])

  const active = useMemo(() => orders.filter(isActive), [orders])
  const overdue = useMemo(() => active.filter((o) => deadlineState(o, warn) === 'overdue'), [active, warn])

  // Filter yang berlaku di kedua mode (cari + level); tab status hanya untuk mode tabel.
  const base = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '').replace(/^0/, '')
    return active
      .filter((o) => !level || o.level === level)
      .filter(
        (o) =>
          !needle ||
          [o.task_name, o.customer_name, o.region, o.order_no, o.notes].some((f) => f?.toLowerCase().includes(needle)) ||
          (digits.length >= 3 && o.phone_norm?.includes(digits)),
      )
      .sort((a, b) =>
        sort === 'deadline' ? a.deadline.localeCompare(b.deadline) : sort === 'price' ? Number(b.price) - Number(a.price) : b.created_at.localeCompare(a.created_at),
      )
  }, [active, level, q, sort])

  const list = useMemo(
    () => base.filter((o) => (tab === 'all' ? true : tab === 'late' ? deadlineState(o, warn) === 'overdue' : o.status === tab)),
    [base, tab, warn],
  )

  // Bersihkan pilihan yang sudah tidak terlihat
  useEffect(() => {
    setSelected((s) => {
      const ids = new Set(list.map((o) => o.id))
      const next = new Set([...s].filter((id) => ids.has(id)))
      return next.size === s.size ? s : next
    })
  }, [list])

  if (loading) return <FullLoader />

  const tabs = [
    { value: 'all', label: 'Semua aktif', count: active.length },
    ...ACTIVE_STATUSES.map((s) => ({ value: s, label: statusOf(s).label, count: active.filter((o) => o.status === s).length })),
    { value: 'late', label: 'Terlambat', icon: AlertTriangle, count: overdue.length, alert: overdue.length > 0 },
  ]
  const filtered = q || level

  return (
    <>
      <PageHeader
        title={L.menu_po}
        subtitle={`${active.length} ${L.order.toLowerCase()} aktif · ${formatRupiah(sumPrice(active))} belum selesai`}
        action={
          <>
            <Tabs
              value={view}
              onChange={setView}
              tabs={[
                { value: 'table', label: 'Tabel', icon: Rows3, title: 'Tampilan tabel' },
                { value: 'board', label: 'Papan', icon: Columns3, title: 'Tampilan papan tiket' },
              ]}
            />
            <Button onClick={() => ui.newOrder()} className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> {L.order} baru
              <kbd className="ml-1 rounded border border-white/30 px-1 text-[10px] text-white/80">N</kbd>
            </Button>
          </>
        }
      />

      {view === 'table' && <Tabs variant="underline" tabs={tabs} value={tab} onChange={setTab} className="mb-3" />}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            data-page-search
            className="input pl-9 pr-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (setQ(''), e.currentTarget.blur())}
            placeholder={`Cari ${L.task_name.toLowerCase()}, ${L.customer.toLowerCase()}, no. HP, ${L.region.toLowerCase()}…`}
          />
          {!q && <Kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink" aria-label="Hapus pencarian">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="w-[calc(50%-4px)] sm:w-44">
          <Select options={levels} placeholder={`Semua ${L.level.toLowerCase()}`} value={level} onChange={(e) => setLevel(e.target.value)} />
        </div>
        <div className="w-[calc(50%-4px)] sm:w-56">
          <Select options={SORTS} value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
      </div>

      {view === 'table' ? (
        <TableView list={list} active={active} filtered={filtered || tab !== 'all'} selected={selected} setSelected={setSelected} />
      ) : (
        <BoardView list={base} />
      )}

      {view === 'table' && selected.size > 0 && (
        <BulkBar items={list.filter((o) => selected.has(o.id))} onClear={() => setSelected(new Set())} />
      )}
    </>
  )
}

// =====================================================================  Tabel
function RowActions({ o }) {
  const ui = useUI()
  const { setStatus, remove } = useOrderActions()
  const wa = waLink(o.phone)
  const next = nextStatus(o.status)
  return (
    <Menu
      width={210}
      items={[
        next && { label: next.value === 'selesai' ? 'Tandai selesai' : `Lanjut: ${next.label}`, icon: next.value === 'selesai' ? CheckCircle2 : ArrowRight, onSelect: () => setStatus(o, next.value) },
        wa && { label: 'Chat WhatsApp', icon: MessageCircle, onSelect: () => window.open(wa, '_blank', 'noopener') },
        { label: 'Edit', icon: Pencil, onSelect: () => ui.editOrder(o) },
        'divider',
        { label: 'Hapus', icon: Trash2, danger: true, onSelect: () => remove(o) },
      ]}
      trigger={(p) => (
        <button
          {...p}
          className="rounded-md p-1.5 text-ink-3 opacity-60 transition hover:bg-slate-100 hover:text-ink group-hover:opacity-100 dark:hover:bg-white/10 aria-expanded:opacity-100"
          aria-label={`Aksi untuk ${o.order_no}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    />
  )
}

function TableView({ list, active, filtered, selected, setSelected }) {
  const { labels: L, levels, settings } = useAuth()
  const ui = useUI()
  const warn = settings.deadline_warning_days
  const all = list.length > 0 && list.every((o) => selected.has(o.id))
  const some = !all && list.some((o) => selected.has(o.id))
  const toggle = (id, on) =>
    setSelected((s) => {
      const n = new Set(s)
      on ? n.add(id) : n.delete(id)
      return n
    })

  if (!list.length) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardList}
          title={active.length ? 'Tidak ada yang cocok' : `Belum ada ${L.order.toLowerCase()} aktif`}
          description={active.length ? 'Ubah kata kunci, filter, atau tab.' : `Catat ${L.order.toLowerCase()} pertama Anda. Tekan N kapan saja.`}
          action={
            !active.length && (
              <Button onClick={() => ui.newOrder()}>
                <Plus className="h-4 w-4" /> {L.order} baru
              </Button>
            )
          }
        />
      </Card>
    )
  }

  const open = (e, o) => {
    if (e.target.closest('button,a,input,[role=menu]')) return
    ui.openOrder(o.id)
  }

  return (
    <Card className="overflow-hidden">
      {/* Desktop */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px]">
          <thead className="border-b hairline bg-slate-50/70 dark:bg-white/[.02]">
            <tr>
              <th className="table-head w-10 pl-4 pr-0">
                <Checkbox checked={all} indeterminate={some} onChange={(on) => setSelected(on ? new Set(list.map((o) => o.id)) : new Set())} label="Pilih semua" />
              </th>
              <th className="table-head w-[88px]">No.</th>
              <th className="table-head">{L.task_name}</th>
              <th className="table-head w-[150px]">{L.deadline}</th>
              <th className="table-head w-[100px]">{L.level}</th>
              <th className="table-head w-[120px] text-right">{L.price}</th>
              <th className="table-head w-[130px]">Bayar</th>
              <th className="table-head w-[190px]">Status</th>
              <th className="table-head w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line dark:divide-line-dark">
            {list.map((o) => {
              const sel = selected.has(o.id)
              return (
                <tr
                  key={o.id}
                  onClick={(e) => open(e, o)}
                  className={clsx('group cursor-pointer transition', sel ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[.03]')}
                >
                  <td className="table-cell w-10 pl-4 pr-0">
                    <Checkbox checked={sel} onChange={(on) => toggle(o.id, on)} label={`Pilih ${o.order_no}`} />
                  </td>
                  <td className="table-cell num whitespace-nowrap text-[13px] font-semibold text-ink-2 dark:text-[#b9b8b1]">{o.order_no}</td>
                  <td className="table-cell max-w-0">
                    <p className="truncate font-semibold" title={o.task_name}>
                      {o.task_name}
                    </p>
                    <p className="faint truncate text-xs">
                      {o.customer_name ? `${o.customer_name} · ` : ''}
                      {prettyPhone(o.phone)}
                      {o.region ? ` · ${o.region}` : ''}
                    </p>
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    <p className="text-[13px]">{formatDate(o.deadline, 'd MMM')}</p>
                    <DeadlineText order={o} warnDays={warn} />
                  </td>
                  <td className="table-cell whitespace-nowrap text-[13px]">{levelLabel(levels, o.level)}</td>
                  <td className="table-cell num whitespace-nowrap text-right font-semibold">{formatRupiah(o.price)}</td>
                  <td className="table-cell">
                    <PaymentBadge order={o} />
                  </td>
                  <td className="table-cell">
                    <StatusMenu order={o} />
                  </td>
                  <td className="table-cell pr-3">
                    <RowActions o={o} />
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t hairline bg-slate-50/70 dark:bg-white/[.02]">
            <tr>
              <td colSpan={5} className="faint px-4 py-2 text-xs">
                {list.length} {L.order.toLowerCase()}
                {filtered ? ` (dari ${active.length} aktif)` : ''}
              </td>
              <td className="num px-3 py-2 text-right text-xs font-semibold">{formatRupiah(sumPrice(list))}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* HP: daftar ringkas, ketuk untuk detail */}
      <ul className="divide-y divide-line dark:divide-line-dark md:hidden">
        {list.map((o) => (
          <li key={o.id} onClick={(e) => open(e, o)} className="cursor-pointer space-y-2 px-4 py-3 active:bg-slate-50 dark:active:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="faint num text-[11px] font-semibold">
                  {o.order_no} · {levelLabel(levels, o.level)}
                </p>
                <p className="font-semibold leading-snug">{o.task_name}</p>
                <p className="faint truncate text-xs">
                  {o.customer_name || prettyPhone(o.phone)}
                  {o.region ? ` · ${o.region}` : ''}
                </p>
              </div>
              <p className="num shrink-0 text-[15px] font-bold">{formatRupiah(o.price)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusMenu order={o} />
              <DeadlineText order={o} warnDays={warn} />
              <PaymentBadge order={o} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function BulkBar({ items, onClear }) {
  const { setStatusBulk, removeBulk } = useOrderActions()
  const [busy, setBusy] = useState(false)
  const run = async (fn) => {
    setBusy(true)
    const ok = await fn()
    setBusy(false)
    if (ok) onClear()
  }
  return (
    <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-3 lg:bottom-6" role="toolbar" aria-label="Aksi untuk order terpilih">
      <div className="flex animate-slide-up items-center gap-1 rounded-xl border border-white/10 bg-[#1b1b1a] p-1.5 pl-3 text-white shadow-pop">
        <span className="num mr-2 text-[13px] font-semibold">{items.length} dipilih</span>
        <Menu
          width={210}
          align="start"
          header="Ubah status ke"
          items={ORDER_STATUSES.map((s) => ({ label: s.label, dot: TONE_DOTS[s.tone], onSelect: () => run(() => setStatusBulk(items, s.value)) }))}
          trigger={(p) => (
            <button {...p} disabled={busy} className="h-8 rounded-md px-2.5 text-[13px] font-semibold hover:bg-white/10">
              Ubah status
            </button>
          )}
        />
        <button disabled={busy} onClick={() => run(() => setStatusBulk(items, 'selesai'))} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold hover:bg-white/10">
          <Check className="h-4 w-4" /> Selesai
        </button>
        <button disabled={busy} onClick={() => run(() => removeBulk(items))} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold text-[#ff8f8f] hover:bg-white/10">
          <Trash2 className="h-4 w-4" /> Hapus
        </button>
        <button onClick={onClear} className="ml-1 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Batalkan pilihan">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// =====================================================================  Papan tiket (kitchen display)
function BoardView({ list }) {
  const { labels: L } = useAuth()
  const { setStatus } = useOrderActions()
  const ui = useUI()
  const [over, setOver] = useState(null)
  const [dragId, setDragId] = useState(null)
  const cols = [...ACTIVE_STATUSES, 'selesai']

  const drop = (status) => (e) => {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData('text/plain')
    const o = list.find((x) => x.id === id)
    setDragId(null)
    if (o && o.status !== status) setStatus(o, status)
  }

  return (
    <>
      <p className="faint mb-3 hidden text-xs md:block">Seret tiket ke kolom lain untuk mengubah status. Tiket yang dijatuhkan ke “Selesai” pindah ke Riwayat.</p>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-[repeat(3,minmax(0,1fr))_200px] md:overflow-visible">
        {cols.map((status) => {
          const s = statusOf(status)
          const items = status === 'selesai' ? [] : list.filter((o) => o.status === status)
          const isDone = status === 'selesai'
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(status)
              }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(null)}
              onDrop={drop(status)}
              className={clsx(
                'flex w-[84vw] shrink-0 snap-start flex-col rounded-xl border transition sm:w-[300px] md:w-auto',
                isDone && 'hidden md:flex',
                over === status ? 'border-brand-400 bg-brand-50/60 dark:border-brand-400/60 dark:bg-brand-500/10' : 'border-line bg-[#f1f1ee] dark:border-line-dark dark:bg-white/[.03]',
                isDone && over !== status && 'border-dashed',
              )}
              aria-label={`Kolom ${s.label}`}
            >
              {/* Tali tiket: penjepit menggantung di sini */}
              <header className="flex items-center gap-2 border-b hairline px-3 py-2.5">
                <span className={clsx('h-2 w-2 rounded-full', TONE_DOTS[s.tone])} />
                <h2 className="min-w-0 truncate text-[13px] font-bold" title={s.label}>{s.label}</h2>
                {!isDone && <span className="num faint text-xs">{items.length}</span>}
                {!isDone && (
                  <>
                    <span className="num faint ml-auto hidden shrink-0 text-xs xl:inline">{formatRupiah(sumPrice(items))}</span>
                    <button
                      onClick={() => ui.newOrder({ status })}
                      className="rounded p-1 text-ink-3 hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
                      aria-label={`Tambah ${L.order.toLowerCase()} ke ${s.label}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </header>
              <div className="relative flex-1 space-y-3 px-2.5 pb-3 pt-4">
                <span aria-hidden className="pointer-events-none absolute inset-x-3 top-[18px] h-px bg-[repeating-linear-gradient(90deg,#c9c8c2_0_6px,transparent_6px_10px)] dark:bg-[repeating-linear-gradient(90deg,#3a3a37_0_6px,transparent_6px_10px)]" />
                {isDone ? (
                  <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center">
                    <CheckCircle2 className={clsx('h-7 w-7', over === status ? 'text-[#0ca30c]' : 'text-ink-3')} />
                    <p className="faint px-3 text-xs">Jatuhkan tiket di sini untuk menandai selesai</p>
                  </div>
                ) : items.length ? (
                  items.map((o) => <Ticket key={o.id} o={o} dragging={dragId === o.id} onDragStart={() => setDragId(o.id)} onDragEnd={() => (setDragId(null), setOver(null))} />)
                ) : (
                  <p className="faint px-2 py-8 text-center text-xs">Kosong</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

function Ticket({ o, dragging, onDragStart, onDragEnd }) {
  const { levels, settings } = useAuth()
  const ui = useUI()
  const { setStatus } = useOrderActions()
  const next = nextStatus(o.status)
  const st = deadlineState(o, settings.deadline_warning_days)
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', o.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => !e.target.closest('button') && ui.openOrder(o.id)}
      className={clsx('group relative cursor-pointer pt-2 transition', dragging && 'opacity-40')}
    >
      {/* penjepit kayu */}
      <span aria-hidden className="absolute left-1/2 top-0 z-10 h-4 w-2.5 -translate-x-1/2 rounded-sm bg-[#f2a33a] shadow-[inset_-1px_0_0_#c7781a]" />
      <div className={clsx('ticket px-3 pt-3 transition group-hover:-translate-y-0.5', st === 'overdue' && 'ring-1 ring-inset ring-[#d03b3b]/40')}>
        <div className="flex items-center justify-between gap-2 border-b border-dashed border-[#dedcd3] pb-1.5 dark:border-white/10">
          <span className="num font-mono text-[11px] font-bold tracking-wide text-ink-2 dark:text-[#b9b8b1]">{o.order_no}</span>
          <DeadlineText order={o} warnDays={settings.deadline_warning_days} className="!text-[11px]" />
        </div>
        <h3 className="mt-2 line-clamp-2 text-[13px] font-bold leading-snug">{o.task_name}</h3>
        <p className="faint mt-0.5 truncate text-xs">{o.customer_name || prettyPhone(o.phone)}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-ink-2 dark:text-[#b9b8b1]">{levelLabel(levels, o.level)}</span>
          <span className="num text-[13px] font-bold">{formatRupiah(o.price)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <PaymentBadge order={o} />
          {next && (
            <button
              onClick={() => setStatus(o, next.value)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-brand-600 opacity-100 hover:bg-brand-50 md:opacity-0 md:group-hover:opacity-100 dark:text-brand-300 dark:hover:bg-brand-500/10"
              title={`Pindah ke ${next.label}`}
            >
              {next.value === 'selesai' ? 'Selesai' : next.label} <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
