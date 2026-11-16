import { useMemo } from 'react'
import { Field, Input, Select } from './ui'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { customerKey, customersFromOrders } from '@/lib/analytics'
import { formatDate, prettyPhone } from '@/lib/format'

/**
 * Pilih pelanggan dari daftar order (dropdown) atau isi manual.
 * value = { customer_name, phone, order_id }
 */
export default function CustomerPicker({ value, onChange, requireName }) {
  const { labels: L } = useAuth()
  const { orders } = useData()
  const customers = useMemo(() => customersFromOrders(orders).sort((a, b) => (a.name || a.phone).localeCompare(b.name || b.phone)), [orders])

  const currentKey = value.phone || value.customer_name ? customerKey(value) : ''
  const known = customers.find((c) => c.key === currentKey)
  const mode = known ? known.key : value._manual || currentKey ? '__manual' : ''

  const custOrders = useMemo(
    () => (known ? orders.filter((o) => customerKey(o) === known.key).sort((a, b) => b.created_at.localeCompare(a.created_at)) : []),
    [orders, known],
  )

  const pick = (e) => {
    const k = e.target.value
    if (k === '__manual') return onChange({ customer_name: '', phone: '', order_id: null, _manual: true })
    if (!k) return onChange({ customer_name: '', phone: '', order_id: null, _manual: false })
    const c = customers.find((x) => x.key === k)
    onChange({ customer_name: c.name, phone: c.phone, order_id: null, _manual: false })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={L.customer} required className="sm:col-span-2">
        <Select
          value={mode}
          onChange={pick}
          placeholder={`— Pilih ${L.customer.toLowerCase()} —`}
          options={[
            ...customers.map((c) => ({
              value: c.key,
              label: `${c.name || '(tanpa nama)'} · ${prettyPhone(c.phone)} · ${c.orders} order`,
            })),
            { value: '__manual', label: `+ Isi manual (${L.customer.toLowerCase()} belum ada di order)` },
          ]}
        />
      </Field>
      {mode === '__manual' && (
        <>
          <Field label={L.customer_name} required={requireName}>
            <Input value={value.customer_name} onChange={(e) => onChange({ ...value, customer_name: e.target.value })} maxLength={80} />
          </Field>
          <Field label={L.phone}>
            <Input value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} inputMode="tel" maxLength={25} />
          </Field>
        </>
      )}
      {known && (
        <>
          {!known.name && (
            <Field label={L.customer_name} required={requireName}>
              <Input value={value.customer_name} onChange={(e) => onChange({ ...value, customer_name: e.target.value })} maxLength={80} />
            </Field>
          )}
          <Field label={`Terkait ${L.order.toLowerCase()}`} hint="Opsional" className={known.name ? 'sm:col-span-2' : ''}>
            <Select
              value={value.order_id || ''}
              onChange={(e) => onChange({ ...value, order_id: e.target.value || null })}
              placeholder="— Tidak spesifik —"
              options={custOrders.map((o) => ({ value: o.id, label: `${o.order_no} · ${o.task_name} · ${formatDate(o.deadline)}` }))}
            />
          </Field>
        </>
      )}
    </div>
  )
}
