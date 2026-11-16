import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Search, Trash2, UserRoundCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Badge, Button, Card, EmptyState, Field, FullLoader, Input, Modal, MultiSelect, PageHeader, Select, StatCard, Tabs, Textarea, useConfirm } from '@/components/ui'
import CustomerPicker from '@/components/CustomerPicker'
import { BEHAVIORS, COMPLAINTS, LOYALTY_SCORES, TASK_STATUSES, labelOf } from '@/lib/constants'
import { customerKey } from '@/lib/analytics'
import { formatDate, prettyPhone } from '@/lib/format'
import { errorMessage } from '@/lib/supabase'

const blank = { customer_name: '', phone: '', order_id: null, task_status: 'sudah', loyalty_score: '8', behaviors: [], complaints: [], notes: '' }

function ReviewForm({ open, onClose, review }) {
  const { labels: L } = useAuth()
  const { saveReview } = useData()
  const [v, setV] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setV(review ? { ...blank, ...review, loyalty_score: String(review.loyalty_score) } : blank)
  }, [open, review])

  const submit = async (e) => {
    e.preventDefault()
    if (!v.customer_name.trim() && !v.phone.trim()) return toast.error(`Pilih atau isi ${L.customer.toLowerCase()} terlebih dulu`)
    setSaving(true)
    try {
      await saveReview(
        {
          customer_name: v.customer_name.trim(),
          phone: v.phone.trim(),
          order_id: v.order_id || null,
          task_status: v.task_status,
          loyalty_score: Number(v.loyalty_score),
          behaviors: v.behaviors,
          complaints: v.complaints,
          notes: v.notes.trim(),
        },
        review?.id,
      )
      toast.success('Penilaian disimpan')
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
      title={review ? 'Edit penilaian' : `Nilai ${L.customer.toLowerCase()}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" form="review-form" loading={saving}>Simpan</Button>
        </>
      }
    >
      <form id="review-form" onSubmit={submit} className="space-y-4">
        <CustomerPicker value={v} onChange={(c) => setV((s) => ({ ...s, ...c }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status tugas" required>
            <Select options={TASK_STATUSES} value={v.task_status} onChange={(e) => setV({ ...v, task_status: e.target.value })} />
          </Field>
          <Field label="Skor loyalitas (1–10)" required hint="10 = sangat loyal">
            <Select options={LOYALTY_SCORES} value={v.loyalty_score} onChange={(e) => setV({ ...v, loyalty_score: e.target.value })} />
          </Field>
          <Field label="Perilaku pelanggan" hint="Boleh pilih lebih dari satu" className="sm:col-span-2">
            <MultiSelect options={BEHAVIORS} value={v.behaviors} onChange={(behaviors) => setV({ ...v, behaviors })} placeholder="Pilih perilaku…" />
          </Field>
          <Field label="Jenis keluhan" hint="Kosongkan jika tidak ada keluhan" className="sm:col-span-2">
            <MultiSelect options={COMPLAINTS} value={v.complaints} onChange={(complaints) => setV({ ...v, complaints })} placeholder="Tidak ada keluhan" />
          </Field>
          <Field label="Catatan" className="sm:col-span-2">
            <Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={1000} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

const scoreTone = (s) => (s >= 8 ? 'green' : s >= 5 ? 'amber' : 'red')

export default function Performa() {
  const { labels: L } = useAuth()
  const { reviews, loading, deleteReview } = useData()
  const confirm = useConfirm()
  const [view, setView] = useState('cards')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [edit, setEdit] = useState(null)

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return reviews
      .filter((r) => !status || r.task_status === status)
      .filter((r) => !n || r.customer_name?.toLowerCase().includes(n) || r.phone?.includes(n) || r.notes?.toLowerCase().includes(n))
  }, [reviews, q, status])

  const perCustomer = useMemo(() => {
    const map = new Map()
    for (const r of filtered) {
      const k = customerKey(r)
      const e = map.get(k) || { key: k, name: r.customer_name, phone: r.phone, n: 0, sum: 0, complaints: 0, returns: 0 }
      if (!e.name && r.customer_name) e.name = r.customer_name
      e.n += 1
      e.sum += r.loyalty_score
      e.complaints += r.complaints.length
      e.returns += r.task_status === 'return' ? 1 : 0
      map.set(k, e)
    }
    return [...map.values()].map((e) => ({ ...e, avg: e.sum / e.n })).sort((a, b) => b.avg - a.avg)
  }, [filtered])

  if (loading) return <FullLoader />

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.loyalty_score, 0) / reviews.length : 0
  const withComplaint = reviews.filter((r) => r.complaints.length).length

  const remove = async (r) => {
    if (!(await confirm({ title: 'Hapus penilaian?', message: `Penilaian untuk ${r.customer_name || r.phone} akan dihapus.`, danger: true, confirmText: 'Hapus' }))) return
    try {
      await deleteReview(r.id)
      toast.success('Penilaian dihapus')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader
        title={`Performa ${L.customer}`}
        subtitle={`Catatan penilaian Anda terhadap setiap ${L.customer.toLowerCase()} — hanya terlihat oleh Anda.`}
        action={
          <Button onClick={() => { setEdit(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> Nilai {L.customer}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total penilaian" value={reviews.length} icon={UserRoundCheck} />
        <StatCard label={`${L.customer} dinilai`} value={new Set(reviews.map(customerKey)).size} />
        <StatCard label="Rata-rata loyalitas" value={avg ? avg.toFixed(1) + ' / 10' : '-'} accent="green" />
        <StatCard label="Penilaian dengan keluhan" value={withComplaint} accent={withComplaint ? 'red' : 'amber'} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Tabs tabs={[{ value: 'cards', label: 'Kartu penilaian' }, { value: 'summary', label: `Ringkasan per ${L.customer.toLowerCase()}` }]} value={view} onChange={setView} />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${L.customer.toLowerCase()}…`} className="pl-9" />
        </div>
        <div className="sm:w-48">
          <Select options={TASK_STATUSES} placeholder="Semua status tugas" value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={UserRoundCheck} title="Belum ada penilaian" description={`Beri skor loyalitas, perilaku, dan keluhan untuk tiap ${L.customer.toLowerCase()}.`} />
        </Card>
      ) : view === 'cards' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const st = TASK_STATUSES.find((s) => s.value === r.task_status)
            return (
              <Card key={r.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{r.customer_name || '(tanpa nama)'}</p>
                    <p className="faint text-xs">{prettyPhone(r.phone)} · {formatDate(r.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="faint text-[10px] font-bold uppercase">Loyalitas</p>
                    <Badge tone={scoreTone(r.loyalty_score)} className="num text-sm">{r.loyalty_score}/10</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={st?.tone}>Tugas: {st?.label}</Badge>
                  {r.behaviors.map((b) => (
                    <Badge key={b} tone={BEHAVIORS.find((x) => x.value === b)?.positive ? 'blue' : 'slate'}>
                      {labelOf(BEHAVIORS, b)}
                    </Badge>
                  ))}
                </div>
                {r.complaints.length > 0 && (
                  <div className="mt-2.5 rounded-xl bg-red-50 p-2.5 dark:bg-red-500/10">
                    <p className="text-[11px] font-bold uppercase text-red-700 dark:text-red-300">Keluhan</p>
                    <ul className="mt-0.5 list-inside list-disc text-xs text-red-800 dark:text-red-200">
                      {r.complaints.map((c) => <li key={c}>{labelOf(COMPLAINTS, c)}</li>)}
                    </ul>
                  </div>
                )}
                {r.notes && <p className="muted mt-2.5 text-sm">{r.notes}</p>}
                <div className="mt-auto flex justify-end gap-1 pt-3">
                  <button onClick={() => { setEdit(r); setFormOpen(true) }} className="rounded-lg p-2 text-ink-3 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/5" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(r)} className="rounded-lg p-2 text-ink-3 hover:bg-red-50 hover:text-[#d03b3b] dark:hover:bg-red-500/10" title="Hapus">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="table-head">{L.customer}</th>
                <th className="table-head text-right">Penilaian</th>
                <th className="table-head text-right">Rata-rata loyalitas</th>
                <th className="table-head text-right">Keluhan</th>
                <th className="table-head text-right">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {perCustomer.map((c) => (
                <tr key={c.key}>
                  <td className="table-cell">
                    <p className="font-semibold">{c.name || '(tanpa nama)'}</p>
                    <p className="faint text-xs">{prettyPhone(c.phone)}</p>
                  </td>
                  <td className="table-cell num text-right">{c.n}</td>
                  <td className="table-cell text-right"><Badge tone={scoreTone(c.avg)} className="num">{c.avg.toFixed(1)}</Badge></td>
                  <td className="table-cell num text-right">{c.complaints}</td>
                  <td className="table-cell num text-right">{c.returns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ReviewForm open={formOpen} onClose={() => setFormOpen(false)} review={edit} />
    </>
  )
}
