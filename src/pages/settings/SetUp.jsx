import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Button, Card, CardHeader, Field, Input, Select, Toggle, useConfirm } from '@/components/ui'
import { BUSINESS_PRESETS, DEFAULT_LABELS, LABEL_FIELDS } from '@/lib/constants'
import { errorMessage } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'

export default function SetUp() {
  const { settings, updateSettings } = useAuth()
  const { orders } = useData()
  const confirm = useConfirm()
  const [v, setV] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setV({
      business_type: settings.business_type,
      labels: { ...DEFAULT_LABELS, ...settings.labels },
      task_levels: settings.task_levels.map((l) => ({ ...l })),
      deadline_warning_days: String(settings.deadline_warning_days),
      restore_window_days: String(settings.restore_window_days),
      allow_restore_after_window: settings.allow_restore_after_window,
      monthly_target: String(Number(settings.monthly_target) || 0),
    })
  }, [settings])

  const usedLevels = useMemo(() => new Set(orders.map((o) => o.level)), [orders])
  if (!v) return null

  const applyPreset = async (id) => {
    const p = BUSINESS_PRESETS.find((x) => x.id === id)
    const ok = await confirm({
      title: `Terapkan preset “${p.name}”?`,
      message: 'Nama kolom dan daftar level akan diganti sesuai preset (data order tidak berubah; level 1–4 tetap dipetakan ke urutan yang sama). Perubahan baru tersimpan setelah klik Simpan.',
      confirmText: 'Terapkan',
    })
    if (!ok) return
    setV((s) => ({
      ...s,
      business_type: id,
      labels: { ...DEFAULT_LABELS, ...p.labels },
      task_levels: p.levels.map((l, i) => ({ value: s.task_levels[i]?.value ?? l.value, label: l.label })),
    }))
  }

  const setLabel = (k, val) => setV((s) => ({ ...s, labels: { ...s.labels, [k]: val } }))
  const setLevel = (i, label) => setV((s) => ({ ...s, task_levels: s.task_levels.map((l, j) => (j === i ? { ...l, label } : l)) }))
  const addLevel = () =>
    setV((s) => {
      let n = s.task_levels.length + 1
      while (s.task_levels.some((l) => l.value === `l${n}`)) n++
      return { ...s, task_levels: [...s.task_levels, { value: `l${n}`, label: `Level ${s.task_levels.length + 1}` }] }
    })
  const removeLevel = (i) => setV((s) => ({ ...s, task_levels: s.task_levels.filter((_, j) => j !== i) }))

  const save = async () => {
    const warn = Number(v.deadline_warning_days)
    const win = Number(v.restore_window_days)
    const target = Number(v.monthly_target)
    if (!Number.isInteger(warn) || warn < 0 || warn > 30) return toast.error('Peringatan deadline harus 0–30 hari')
    if (!Number.isInteger(win) || win < 1 || win > 3650) return toast.error('Batas pemulihan harus 1–3650 hari')
    if (!(target >= 0)) return toast.error('Target bulanan tidak valid')
    const levels = v.task_levels.map((l) => ({ ...l, label: l.label.trim() })).filter((l) => l.label)
    if (levels.length < 1) return toast.error('Minimal satu level')
    const labels = {}
    for (const f of LABEL_FIELDS) {
      const val = (v.labels[f.key] || '').trim()
      if (val && val !== DEFAULT_LABELS[f.key]) labels[f.key] = val.slice(0, 40)
    }
    setSaving(true)
    try {
      await updateSettings({
        business_type: v.business_type,
        labels,
        task_levels: levels,
        deadline_warning_days: warn,
        restore_window_days: win,
        allow_restore_after_window: v.allow_restore_after_window,
        monthly_target: target,
      })
      toast.success('Set up disimpan')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Jenis usaha" subtitle="Pilih preset agar istilah di seluruh menu sesuai bidang usaha. Semua istilah tetap bisa diubah manual." />
        <div className="p-5">
          <Field label="Preset jenis usaha">
            <Select options={BUSINESS_PRESETS.map((p) => ({ value: p.id, label: p.name }))} value={v.business_type} onChange={(e) => applyPreset(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Nama kolom & menu"
          subtitle="Istilah yang tampil di form, tabel, dan laporan."
          action={
            <Button variant="ghost" size="sm" onClick={() => setV((s) => ({ ...s, labels: { ...DEFAULT_LABELS } }))}>
              <RotateCcw className="h-3.5 w-3.5" /> Default
            </Button>
          }
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {LABEL_FIELDS.map((f) => (
            <Field key={f.key} label={DEFAULT_LABELS[f.key]} hint={f.hint}>
              <Input value={v.labels[f.key] ?? ''} onChange={(e) => setLabel(f.key, e.target.value)} maxLength={40} />
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={`Pilihan ${v.labels.level || 'level'}`} subtitle="Isi dropdown level di form order. Level yang sudah dipakai order tidak bisa dihapus." />
        <div className="space-y-2 p-5">
          {v.task_levels.map((l, i) => (
            <div key={l.value} className="flex items-center gap-2">
              <span className="faint num w-8 text-center text-xs font-bold">{i + 1}</span>
              <Input value={l.label} onChange={(e) => setLevel(i, e.target.value)} maxLength={30} />
              <button
                onClick={() => removeLevel(i)}
                disabled={usedLevels.has(l.value) || v.task_levels.length <= 1}
                title={usedLevels.has(l.value) ? 'Sedang dipakai order' : 'Hapus'}
                className="rounded-lg p-2 text-ink-3 hover:bg-red-50 hover:text-[#d03b3b] disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {v.task_levels.length < 10 && (
            <Button variant="secondary" size="sm" onClick={addLevel} className="mt-1">
              <Plus className="h-3.5 w-3.5" /> Tambah level
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Aturan operasional" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Peringatan “hampir deadline” (hari)" hint="Order aktif dengan deadline ≤ nilai ini ditandai di Beranda">
            <Input type="number" min="0" max="30" value={v.deadline_warning_days} onChange={(e) => setV({ ...v, deadline_warning_days: e.target.value })} />
          </Field>
          <Field label="Target pendapatan bulanan (Rp)" hint={Number(v.monthly_target) ? formatRupiah(v.monthly_target) : '0 = tidak ditampilkan'}>
            <Input type="number" min="0" step="10000" value={v.monthly_target} onChange={(e) => setV({ ...v, monthly_target: e.target.value })} />
          </Field>
          <Field label="Batas pemulihan Riwayat (hari)" hint="Default 30 hari (± 1 bulan) setelah order selesai">
            <Input type="number" min="1" max="3650" value={v.restore_window_days} onChange={(e) => setV({ ...v, restore_window_days: e.target.value })} />
          </Field>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <Toggle
              checked={v.allow_restore_after_window}
              onChange={(allow_restore_after_window) => setV({ ...v, allow_restore_after_window })}
              label="Izinkan pemulihan setelah batas"
              description="Jika aktif, order yang sudah terkunci di Riwayat tetap bisa dikembalikan ke On Progress."
            />
          </div>
        </div>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} loading={saving} className="shadow-lg">Simpan set up</Button>
      </div>
    </div>
  )
}
