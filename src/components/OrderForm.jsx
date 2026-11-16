import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { errorMessage } from '@/lib/supabase'
import { customersFromOrders } from '@/lib/analytics'
import { dateKey, formatRupiah, prettyPhone } from '@/lib/format'

const empty = (levels) => ({
  customer_name: '',
  phone: '',
  task_name: '',
  deadline: dateKey(new Date(Date.now() + 3 * 86400000)),
  payment_status: 'dp',
  payment_note: '',
  status: 'antrian',
  price: '',
  level: levels[0]?.value ?? 'l1',
  region: '',
  notes: '',
})

export default function OrderForm({ open, onClose, order }) {
  const { labels: L, levels } = useAuth()
  const { saveOrder, orders } = useData()
  const [v, setV] = useState(empty(levels))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setV(
      order
        ? {
            customer_name: order.customer_name ?? '',
            phone: order.phone ?? '',
            task_name: order.task_name ?? '',
            deadline: order.deadline,
            payment_status: order.payment_status,
            payment_note: order.payment_note ?? '',
            status: order.status,
            price: String(Math.round(Number(order.price) || 0)),
            level: order.level,
            region: order.region ?? '',
            notes: order.notes ?? '',
          }
        : empty(levels),
    )
  }, [open, order, levels])

  const customers = useMemo(() => customersFromOrders(orders), [orders])
  const regions = useMemo(() => [...new Set(orders.map((o) => o.region?.trim()).filter(Boolean))].sort(), [orders])

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))

  // isi nama otomatis saat nomor HP cocok dengan pelanggan lama
  const onPhoneBlur = () => {
    const d = v.phone.replace(/\D/g, '')
    if (!d || v.customer_name) return
    const key = d.startsWith('0') ? '62' + d.slice(1) : d.startsWith('8') ? '62' + d : d
    const c = customers.find((x) => x.key === key)
    if (c?.name) setV((s) => ({ ...s, customer_name: c.name }))
  }

  const validate = () => {
    const e = {}
    const digits = v.phone.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) e.phone = 'Nomor HP 8–15 digit'
    if (!v.task_name.trim()) e.task_name = 'Wajib diisi'
    if (!v.deadline) e.deadline = 'Pilih tanggal'
    if (v.payment_status === 'lainnya' && !v.payment_note.trim()) e.payment_note = 'Jelaskan status pembayaran'
    const price = Number(v.price)
    if (v.price === '' || Number.isNaN(price) || price < 0) e.price = 'Isi harga yang valid'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...v,
        customer_name: v.customer_name.trim(),
        phone: v.phone.trim(),
        task_name: v.task_name.trim(),
        region: v.region.trim(),
        notes: v.notes.trim(),
        payment_note: v.payment_status === 'lainnya' ? v.payment_note.trim() : '',
        price: Number(v.price),
      }
      const saved = await saveOrder(payload, order?.id)
      toast.success(
        order ? `${saved.order_no} diperbarui` : `${saved.order_no} ditambahkan`,
        saved.status === 'selesai' ? { description: 'Order selesai dipindahkan ke Riwayat.' } : undefined,
      )
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={order ? `Edit ${order.order_no}` : `Tambah ${L.menu_po}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form="order-form" loading={saving}>
            Simpan
          </Button>
        </>
      }
    >
      <form id="order-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={L.phone} required error={errors.phone}>
          <Input
            value={v.phone}
            onChange={set('phone')}
            onBlur={onPhoneBlur}
            inputMode="tel"
            placeholder="08xx-xxxx-xxxx"
            list="ob-phones"
            autoFocus={!order}
          />
          <datalist id="ob-phones">
            {customers.map((c) => (
              <option key={c.key} value={prettyPhone(c.phone)}>
                {c.name}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label={L.customer_name} hint="Opsional, untuk laporan pelanggan">
          <Input value={v.customer_name} onChange={set('customer_name')} placeholder="mis. Budi Santoso" />
        </Field>
        <Field label={L.task_name} required error={errors.task_name} className="sm:col-span-2">
          <Input value={v.task_name} onChange={set('task_name')} placeholder="mis. Makalah Statistika Bab 1–3" />
        </Field>
        <Field label={L.deadline} required error={errors.deadline} hint="Klik ikon kalender untuk memilih">
          <Input type="date" value={v.deadline} onChange={set('deadline')} />
        </Field>
        <Field label={L.price} required error={errors.price} hint={v.price ? formatRupiah(v.price) : 'Dalam rupiah'}>
          <Input value={v.price} onChange={set('price')} inputMode="numeric" type="number" min="0" step="500" placeholder="150000" />
        </Field>
        <Field label="Status Pembayaran" required>
          <Select options={PAYMENT_STATUSES} value={v.payment_status} onChange={set('payment_status')} />
        </Field>
        {v.payment_status === 'lainnya' ? (
          <Field label="Keterangan Pembayaran" required error={errors.payment_note}>
            <Input value={v.payment_note} onChange={set('payment_note')} placeholder="mis. Cicil 3x, barter, gratis" maxLength={120} />
          </Field>
        ) : (
          <Field label="Status Order" required>
            <Select options={ORDER_STATUSES} value={v.status} onChange={set('status')} />
          </Field>
        )}
        {v.payment_status === 'lainnya' && (
          <Field label="Status Order" required>
            <Select options={ORDER_STATUSES} value={v.status} onChange={set('status')} />
          </Field>
        )}
        <Field label={L.level} required>
          <Select options={levels} value={v.level} onChange={set('level')} />
        </Field>
        <Field label={L.region} className={v.payment_status === 'lainnya' ? 'sm:col-span-2' : ''}>
          <Input value={v.region} onChange={set('region')} list="ob-regions" placeholder="mis. Medan" />
          <datalist id="ob-regions">
            {regions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea value={v.notes} onChange={set('notes')} placeholder="Detail permintaan, link file, dll. (opsional)" maxLength={1000} />
        </Field>
      </form>
    </Modal>
  )
}
