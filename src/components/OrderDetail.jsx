import { useMemo } from 'react'
import { ArrowRight, Check, Copy, MessageCircle, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Drawer, Menu, clsx } from './ui'
import { DeadlineText, PaymentBadge, StatusMenu, levelLabel, nextStatus, useOrderActions } from './orderBits'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { ORDER_STATUSES } from '@/lib/constants'
import { formatDate, formatDateTime, formatRupiah, normalizePhone, prettyPhone, waLink } from '@/lib/format'

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm">
      <dt className="faint">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

/** Panel detail order (slide-over kanan di desktop, bottom sheet di HP). */
export default function OrderDetail() {
  const { detailId, closeOrder, editOrder, openOrder } = useUI()
  const { orders } = useData()
  const { labels: L, levels, settings } = useAuth()
  const { setStatus, remove } = useOrderActions()
  const o = orders.find((x) => x.id === detailId)

  // Riwayat order pelanggan yang sama (berdasarkan nomor HP)
  const history = useMemo(() => {
    if (!o) return []
    const key = o.phone_norm || normalizePhone(o.phone)
    return orders.filter((x) => x.id !== o.id && (x.phone_norm || normalizePhone(x.phone)) === key).slice(0, 5)
  }, [o, orders])

  if (!detailId) return null
  if (!o) return null

  const idx = ORDER_STATUSES.findIndex((s) => s.value === o.status)
  const next = nextStatus(o.status)
  const wa = waLink(o.phone)

  return (
    <Drawer open onClose={closeOrder} label={`Detail ${o.order_no}`}>
      <header className="flex items-center gap-2 border-b hairline px-5 py-3">
        <span className="num faint text-[13px] font-semibold">{o.order_no}</span>
        <StatusMenu order={o} />
        <div className="ml-auto flex items-center gap-1">
          <Menu
            items={[
              { label: 'Edit order', icon: Pencil, hint: 'E', onSelect: () => editOrder(o) },
              {
                label: 'Salin ringkasan',
                icon: Copy,
                onSelect: () =>
                  navigator.clipboard
                    ?.writeText(`${o.order_no} · ${o.task_name}\n${L.customer}: ${o.customer_name || '-'} (${prettyPhone(o.phone)})\n${L.deadline}: ${formatDate(o.deadline)}\n${L.price}: ${formatRupiah(o.price)}`)
                    .then(() => toast.success('Ringkasan disalin')),
              },
              'divider',
              { label: 'Hapus order', icon: Trash2, danger: true, onSelect: async () => (await remove(o)) && closeOrder() },
            ]}
            trigger={(p) => (
              <button {...p} className="rounded-md p-1.5 text-ink-3 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Aksi lain">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          />
          <button onClick={closeOrder} className="rounded-md p-1.5 text-ink-3 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <h2 className="text-lg font-bold leading-snug">{o.task_name}</h2>
        <p className="muted mt-1 text-sm">
          {o.customer_name || 'Tanpa nama'} · {prettyPhone(o.phone)}
        </p>
        <p className="num mt-3 text-2xl font-bold tracking-tight">{formatRupiah(o.price)}</p>

        {/* Alur status (stepper yang bisa diklik) */}
        <ol className="mt-5 grid grid-cols-4 gap-1" aria-label="Alur status">
          {ORDER_STATUSES.map((s, i) => {
            const done = i < idx
            const cur = i === idx
            return (
              <li key={s.value}>
                <button
                  type="button"
                  onClick={() => !cur && setStatus(o, s.value)}
                  className="group w-full text-left"
                  title={cur ? 'Status sekarang' : `Pindahkan ke ${s.label}`}
                >
                  <span
                    className={clsx(
                      'block h-1.5 rounded-full transition',
                      done || cur ? (s.value === 'selesai' ? 'bg-[#0ca30c]' : 'bg-brand-500') : 'bg-slate-200 group-hover:bg-slate-300 dark:bg-white/10',
                    )}
                  />
                  <span className={clsx('mt-1.5 block text-[11px] font-semibold leading-tight', cur ? 'text-ink dark:text-white' : 'faint')}>{s.label}</span>
                </button>
              </li>
            )
          })}
        </ol>

        {next && (
          <Button className="mt-4 w-full" variant={next.value === 'selesai' ? 'primary' : 'secondary'} onClick={() => setStatus(o, next.value)}>
            {next.value === 'selesai' ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            {next.value === 'selesai' ? 'Tandai selesai' : `Lanjut ke ${next.label}`}
          </Button>
        )}

        <dl className="mt-5 divide-y hairline border-y">
          <Row label={L.deadline}>
            <span className="font-medium">{formatDate(o.deadline, 'EEEE, d MMM yyyy')}</span>
            <div>
              <DeadlineText order={o} warnDays={settings.deadline_warning_days} />
            </div>
          </Row>
          <Row label={L.level}>{levelLabel(levels, o.level)}</Row>
          <Row label="Pembayaran">
            <PaymentBadge order={o} />
          </Row>
          <Row label={L.region}>{o.region || '—'}</Row>
          <Row label="Dibuat">{formatDateTime(o.created_at)}</Row>
          {o.completed_at && <Row label="Selesai">{formatDateTime(o.completed_at)}</Row>}
          {o.restored_count > 0 && <Row label="Dipulihkan">{o.restored_count}× dari Riwayat</Row>}
        </dl>

        {o.notes && (
          <section className="mt-5">
            <h3 className="faint mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Catatan</h3>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-white/5">{o.notes}</p>
          </section>
        )}

        <section className="mt-5">
          <h3 className="faint mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
            Order lain dari {L.customer.toLowerCase()} ini {history.length > 0 && `(${history.length})`}
          </h3>
          {history.length ? (
            <ul className="divide-y hairline rounded-lg border">
              {history.map((h) => (
                <li key={h.id}>
                  <button onClick={() => openOrder(h.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                    <span className="num faint w-16 shrink-0 text-xs">{h.order_no}</span>
                    <span className="min-w-0 flex-1 truncate">{h.task_name}</span>
                    <span className="num shrink-0 text-xs font-semibold">{formatRupiah(h.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="faint text-sm">Order pertama dari nomor ini.</p>
          )}
        </section>
      </div>

      <footer className="pb-safe flex gap-2 border-t hairline px-5 py-3">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1f9d55] px-3 text-sm font-semibold text-white hover:bg-[#188a49]"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        )}
        <Button variant="secondary" className="flex-1" onClick={() => editOrder(o)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </footer>
    </Drawer>
  )
}
