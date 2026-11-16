import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, MessageSquareQuote, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Badge, Button, Card, EmptyState, Field, FullLoader, Input, Modal, PageHeader, Select, StatCard, Tabs, Textarea, Toggle, useConfirm } from '@/components/ui'
import CustomerPicker from '@/components/CustomerPicker'
import { SENTIMENTS, sentimentFromRating } from '@/lib/constants'
import { sentimentCounts } from '@/lib/analytics'
import { dateKey, formatDate, prettyPhone } from '@/lib/format'
import { errorMessage } from '@/lib/supabase'

const RATINGS = [5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${'★'.repeat(r)}${'☆'.repeat(5 - r)}  (${r})` }))
const blank = () => ({ customer_name: '', phone: '', order_id: null, rating: '5', sentiment: 'positif', content: '', review_date: dateKey(), show_on_home: true, _autoSent: true })

function Stars({ n, size = 'h-4 w-4' }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${n} dari 5`}>
      {Array.from({ length: 5 }, (_, i) => <Star key={i} className={size} fill={i < n ? 'currentColor' : 'none'} />)}
    </span>
  )
}

function TestimonialForm({ open, onClose, item }) {
  const { labels: L } = useAuth()
  const { saveTestimonial } = useData()
  const [v, setV] = useState(blank())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setV(item ? { ...item, rating: String(item.rating), _autoSent: false } : blank())
  }, [open, item])

  const setRating = (e) => {
    const rating = e.target.value
    setV((s) => ({ ...s, rating, sentiment: s._autoSent ? sentimentFromRating(Number(rating)) : s.sentiment }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!v.customer_name.trim()) return toast.error(`Nama ${L.customer.toLowerCase()} wajib diisi`)
    if (!v.content.trim()) return toast.error('Isi ulasan wajib diisi')
    setSaving(true)
    try {
      await saveTestimonial(
        {
          customer_name: v.customer_name.trim(),
          phone: (v.phone || '').trim(),
          order_id: v.order_id || null,
          rating: Number(v.rating),
          sentiment: v.sentiment,
          content: v.content.trim(),
          review_date: v.review_date,
          show_on_home: v.show_on_home,
        },
        item?.id,
      )
      toast.success('Ulasan disimpan')
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
      title={item ? 'Edit ulasan' : 'Tambah ulasan pelanggan'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" form="testi-form" loading={saving}>Simpan</Button>
        </>
      }
    >
      <form id="testi-form" onSubmit={submit} className="space-y-4">
        <CustomerPicker value={v} onChange={(c) => setV((s) => ({ ...s, ...c }))} requireName />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rating" required>
            <Select options={RATINGS} value={v.rating} onChange={setRating} />
          </Field>
          <Field label="Sentimen" required hint={v._autoSent ? 'Otomatis dari rating' : 'Diatur manual'}>
            <Select options={SENTIMENTS} value={v.sentiment} onChange={(e) => setV({ ...v, sentiment: e.target.value, _autoSent: false })} />
          </Field>
          <Field label="Tanggal ulasan" required>
            <Input type="date" value={v.review_date} onChange={(e) => setV({ ...v, review_date: e.target.value })} max={dateKey()} />
          </Field>
        </div>
        <Field label="Isi ulasan" required hint="Salin dari chat/testimoni pelanggan">
          <Textarea value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} maxLength={2000} rows={4} />
        </Field>
        <Toggle checked={v.show_on_home} onChange={(show_on_home) => setV({ ...v, show_on_home })} label="Tampilkan di Beranda" description="Muncul di bagian “Kabar dari pelanggan”." />
      </form>
    </Modal>
  )
}

export default function Ulasan() {
  const { testimonials, loading, deleteTestimonial, saveTestimonial } = useData()
  const confirm = useConfirm()
  const [filter, setFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [edit, setEdit] = useState(null)

  const counts = useMemo(() => sentimentCounts(testimonials), [testimonials])
  const list = filter === 'all' ? testimonials : testimonials.filter((t) => t.sentiment === filter)

  if (loading) return <FullLoader />
  const avg = testimonials.length ? testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length : 0

  const remove = async (t) => {
    if (!(await confirm({ title: 'Hapus ulasan?', message: `Ulasan dari ${t.customer_name} akan dihapus.`, danger: true, confirmText: 'Hapus' }))) return
    try {
      await deleteTestimonial(t.id)
      toast.success('Ulasan dihapus')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }
  const toggleHome = async (t) => {
    try {
      await saveTestimonial({ show_on_home: !t.show_on_home }, t.id)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader
        title="Ulasan"
        subtitle="Ulasan dari pelanggan yang Anda catat sendiri. Ulasan bertanda 'tampil' muncul sebagai berita di Beranda."
        action={<Button onClick={() => { setEdit(null); setFormOpen(true) }}><Plus className="h-4 w-4" /> Tambah ulasan</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total ulasan" value={testimonials.length} icon={MessageSquareQuote} />
        <StatCard label="Rata-rata rating" value={avg ? `${avg.toFixed(2)} / 5` : '-'} accent="amber" />
        <StatCard label="Positif" value={counts.positif} accent="green" />
        <StatCard label="Negatif" value={counts.negatif} accent="red" />
      </div>
      <Tabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        tabs={[{ value: 'all', label: 'Semua', count: testimonials.length }, ...SENTIMENTS.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] }))]}
      />
      {list.length === 0 ? (
        <Card><EmptyState icon={MessageSquareQuote} title="Belum ada ulasan" description="Catat ulasan pelanggan dari chat atau media sosial." /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const s = SENTIMENTS.find((x) => x.value === t.sentiment)
            return (
              <Card key={t.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{t.customer_name}</p>
                    <p className="faint text-xs">{t.phone ? `${prettyPhone(t.phone)} · ` : ''}{formatDate(t.review_date)}</p>
                  </div>
                  <Badge tone={s?.tone}>{s?.label}</Badge>
                </div>
                <div className="mt-2"><Stars n={t.rating} /></div>
                <p className="muted mt-2 whitespace-pre-line text-sm leading-relaxed">“{t.content}”</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <button onClick={() => toggleHome(t)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-brand-600">
                    {t.show_on_home ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {t.show_on_home ? 'Tampil di Beranda' : 'Disembunyikan'}
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => { setEdit(t); setFormOpen(true) }} className="rounded-lg p-2 text-ink-3 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/5" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(t)} className="rounded-lg p-2 text-ink-3 hover:bg-red-50 hover:text-[#d03b3b] dark:hover:bg-red-500/10" title="Hapus"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <TestimonialForm open={formOpen} onClose={() => setFormOpen(false)} item={edit} />
    </>
  )
}
