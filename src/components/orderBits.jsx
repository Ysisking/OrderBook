import { AlertTriangle, CheckCircle2, Clock, Hourglass, Loader, Wallet } from 'lucide-react'
import { Badge } from './ui'
import { ORDER_STATUSES, PAYMENT_STATUSES, labelOf } from '@/lib/constants'
import { deadlineState } from '@/lib/analytics'
import { deadlineText } from '@/lib/format'

const statusIcon = { antrian: Hourglass, on_progress: Loader, menunggu_pelunasan: Wallet, selesai: CheckCircle2 }

export function StatusBadge({ status }) {
  const s = ORDER_STATUSES.find((x) => x.value === status)
  return (
    <Badge tone={s?.tone} icon={statusIcon[status]}>
      {s?.label ?? status}
    </Badge>
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

export const levelLabel = (levels, value) => levels.find((l) => l.value === value)?.label ?? value
