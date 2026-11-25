import { useCallback } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Hourglass, Loader, Wallet } from 'lucide-react'
import { Badge, Menu, TONE_DOTS, clsx, useConfirm } from './ui'
import { useData } from '@/context/DataContext'
import { ORDER_STATUSES, PAYMENT_STATUSES, labelOf } from '@/lib/constants'
import { deadlineState } from '@/lib/analytics'
import { deadlineText } from '@/lib/format'
import { errorMessage } from '@/lib/supabase'

export const statusIcon = { antrian: Hourglass, on_progress: Loader, menunggu_pelunasan: Wallet, selesai: CheckCircle2 }
export const statusOf = (v) => ORDER_STATUSES.find((x) => x.value === v)
export const nextStatus = (v) => {
  const i = ORDER_STATUSES.findIndex((x) => x.value === v)
  return i >= 0 && i < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[i + 1] : null
}

export function StatusBadge({ status }) {
  const s = statusOf(status)
  return (
    <Badge tone={s?.tone} dot>
      {s?.label ?? status}
    </Badge>
  )
}

/** Pill status yang bisa diklik untuk mengganti status (menu tidak terpotong tabel). */
export function StatusMenu({ order, size = 'sm' }) {
  const { setStatus } = useOrderActions()
  const s = statusOf(order.status)
  return (
    <Menu
      width={210}
      align="start"
      header="Ubah status"
      items={ORDER_STATUSES.map((x) => ({
        label: x.label,
        dot: TONE_DOTS[x.tone],
        checked: x.value === order.status,
        onSelect: () => x.value !== order.status && setStatus(order, x.value),
      }))}
      trigger={(p) => (
        <button
          {...p}
          type="button"
          className={clsx(
            'group inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent font-semibold transition hover:border-line-strong dark:hover:border-white/15',
            size === 'sm' ? 'h-7 px-2 text-[12px]' : 'h-8 px-2.5 text-[13px]',
            {
              slate: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
              blue: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
              amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
              green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
            }[s?.tone],
          )}
        >
          <span className={clsx('h-1.5 w-1.5 rounded-full', TONE_DOTS[s?.tone])} />
          {s?.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
        </button>
      )}
    />
  )
}

export function PaymentBadge({ order }) {
  const tone = order.payment_status === 'full' ? 'green' : order.payment_status === 'dp' ? 'amber' : 'violet'
  const text = order.payment_status === 'lainnya' ? order.payment_note || 'Lainnya' : labelOf(PAYMENT_STATUSES, order.payment_status)
  return (
    <Badge tone={tone} className="max-w-[160px] truncate">
      {text}
    </Badge>
  )
}

export function DeadlineBadge({ order, warnDays }) {
  const st = deadlineState(order, warnDays)
  if (st === 'done') return null
  if (st === 'overdue') return <Badge tone="red" icon={AlertTriangle}>{deadlineText(order.deadline)}</Badge>
  if (st === 'soon') return <Badge tone="amber" icon={Clock}>{deadlineText(order.deadline)}</Badge>
  return <Badge tone="slate" icon={Clock}>{deadlineText(order.deadline)}</Badge>
}

/** Teks tenggat ringkas berwarna (untuk tabel padat). */
export function DeadlineText({ order, warnDays, className }) {
  const st = deadlineState(order, warnDays)
  if (st === 'done') return null
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-semibold',
        st === 'overdue' ? 'text-[#c13030] dark:text-[#f07b7b]' : st === 'soon' ? 'text-amber-700 dark:text-amber-300' : 'faint',
        className,
      )}
    >
      {st === 'overdue' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {deadlineText(order.deadline)}
    </span>
  )
}

export const levelLabel = (levels, value) => levels.find((l) => l.value === value)?.label ?? value

/** Aksi order bersama: ubah status, selesai, hapus (tunggal & massal) dengan toast + konfirmasi. */
export function useOrderActions() {
  const { setOrderStatus, deleteOrder, setStatusMany, deleteMany } = useData()
  const confirm = useConfirm()

  const setStatus = useCallback(
    async (o, status) => {
      try {
        await setOrderStatus(o.id, status)
        toast.success(status === 'selesai' ? `${o.order_no} selesai, dipindahkan ke Riwayat` : `${o.order_no}: ${statusOf(status).label}`)
        return true
      } catch (err) {
        toast.error(errorMessage(err))
        return false
      }
    },
    [setOrderStatus],
  )

  const remove = useCallback(
    async (o) => {
      const ok = await confirm({
        title: `Hapus ${o.order_no}?`,
        message: `"${o.task_name}" akan dihapus permanen beserta datanya. Tindakan ini tidak bisa dibatalkan.`,
        confirmText: 'Hapus',
        danger: true,
      })
      if (!ok) return false
      try {
        await deleteOrder(o.id)
        toast.success(`${o.order_no} dihapus`)
        return true
      } catch (err) {
        toast.error(errorMessage(err))
        return false
      }
    },
    [confirm, deleteOrder],
  )

  const setStatusBulk = useCallback(
    async (list, status) => {
      try {
        await setStatusMany(
          list.map((o) => o.id),
          status,
        )
        toast.success(`${list.length} order → ${statusOf(status).label}${status === 'selesai' ? ' (pindah ke Riwayat)' : ''}`)
        return true
      } catch (err) {
        toast.error(errorMessage(err))
        return false
      }
    },
    [setStatusMany],
  )

  const removeBulk = useCallback(
    async (list) => {
      const ok = await confirm({
        title: `Hapus ${list.length} order?`,
        message: `${list
          .slice(0, 5)
          .map((o) => o.order_no)
          .join(', ')}${list.length > 5 ? ` dan ${list.length - 5} lainnya` : ''} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
        confirmText: `Hapus ${list.length} order`,
        danger: true,
      })
      if (!ok) return false
      try {
        await deleteMany(list.map((o) => o.id))
        toast.success(`${list.length} order dihapus`)
        return true
      } catch (err) {
        toast.error(errorMessage(err))
        return false
      }
    },
    [confirm, deleteMany],
  )

  return { setStatus, remove, setStatusBulk, removeBulk }
}
