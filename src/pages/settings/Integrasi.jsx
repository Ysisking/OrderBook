import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeftRight, CheckCircle2, ExternalLink, Link2, Link2Off, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useMoneyOut } from '@/context/MoneyOutContext'
import { Badge, Button, Card, CardHeader, Field, Input, Select, clsx, useConfirm } from '@/components/ui'
import { MODES, MONEYOUT_WEB, desiredRows, moAccount, moConnect, moDisconnect, moRemoveAll } from '@/lib/moneyout'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'

const STATUS_TEXT = {
  pending: 'menunggu persetujuan admin MoneyOut',
  queued: 'dalam antrean admin MoneyOut',
  blocked: 'diblokir di MoneyOut',
  frozen: 'dibekukan di MoneyOut',
}

function MoneyOutMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111] text-[13px] font-black tracking-tight text-[#1baf7a]" aria-hidden>
      M↗
    </span>
  )
}

export default function Integrasi() {
  const { user } = useAuth()
  const { orders } = useData()
  const mo = useMoneyOut()
  const confirm = useConfirm()
  const [account, setAccount] = useState(null)
  const [loadingAcc, setLoadingAcc] = useState(false)
  const [password, setPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [draft, setDraft] = useState(mo.cfg)
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(mo.cfg), [mo.cfg])

  // Muat akun MoneyOut bila sesi di browser ini ada
  useEffect(() => {
    let alive = true
    ;(async () => {
      const s = await mo.refreshSession()
      if (s.state !== 'ok') return
      setLoadingAcc(true)
      try {
        const a = await moAccount()
        if (alive) setAccount(a)
      } catch (e) {
        toast.error(e.message)
      } finally {
        if (alive) setLoadingAcc(false)
      }
    })()
    return () => {
      alive = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    const rows = desiredRows(orders, { ...draft, since: draft.since || '0000-00-00' })
    return { count: rows.size, total: [...rows.values()].reduce((s, r) => s + r.amount, 0) }
  }, [orders, draft])

  const connected = mo.session === 'ok' && account
  const linked = mo.cfg.linked

  const connect = async (e) => {
    e.preventDefault()
    setConnecting(true)
    try {
      const a = await moConnect(user.email, password)
      setAccount(a)
      setPassword('')
      await mo.refreshSession()
      // Pilih default yang masuk akal
      setDraft((d) => ({
        ...d,
        wallet_id: d.wallet_id && a.wallets.some((w) => w.id === d.wallet_id) ? d.wallet_id : a.wallets[0]?.id ?? null,
        category: a.categories.includes(d.category) ? d.category : 'Gaji Bulanan',
      }))
      toast.success(`Masuk ke MoneyOut sebagai ${a.email}`)
      if (linked) mo.syncNow()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const save = async () => {
    if (!account?.active) return toast.error('Akun MoneyOut belum aktif, jadi pemasukan belum bisa ditulis.')
    setSaving(true)
    try {
      const wallet = account.wallets.find((w) => w.id === draft.wallet_id)
      await mo.saveConfig({
        ...draft,
        linked: true,
        mo_email: account.email,
        wallet_name: wallet?.name || '',
        linked_at: mo.cfg.linked_at || new Date().toISOString(),
      })
      toast.success(linked ? 'Pengaturan sinkron disimpan' : 'OrderBook terhubung dengan MoneyOut', { description: 'Pemasukan sedang dikirim ke MoneyOut…' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const unlink = async () => {
    const ok = await confirm({
      title: 'Putuskan hubungan dengan MoneyOut?',
      message:
        'OrderBook berhenti mengirim pemasukan ke MoneyOut. Pemasukan yang sudah tercatat di MoneyOut TIDAK dihapus; hapus manual di MoneyOut bila perlu, atau pilih "Hapus juga" di bawah.',
      confirmText: 'Putuskan',
      danger: true,
    })
    if (!ok) return
    const wipe = await confirm({
      title: 'Hapus juga pemasukan dari OrderBook di MoneyOut?',
      message: `Semua transaksi pemasukan berawalan "OrderBook ·" di MoneyOut akan dihapus permanen. Pilih Batal untuk membiarkannya.`,
      confirmText: 'Ya, hapus juga',
      danger: true,
    })
    try {
      if (wipe && mo.session === 'ok') {
        const n = await moRemoveAll()
        toast.success(`${n} pemasukan dari OrderBook dihapus di MoneyOut`)
      }
      await mo.saveConfig({ linked: false })
      await moDisconnect()
      await mo.refreshSession()
      setAccount(null)
      toast.success('Hubungan dengan MoneyOut diputus')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const last = mo.last

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <ArrowLeftRight className="h-4 w-4 text-ink-3" />
          <MoneyOutMark />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">MoneyOut</h2>
            <p className="muted text-xs">Order yang selesai otomatis masuk sebagai pemasukan di menu Pemasukan MoneyOut.</p>
          </div>
          {linked ? (
            mo.session === 'ok' ? (
              <Badge tone="green" dot>Terhubung</Badge>
            ) : mo.session === 'unknown' ? (
              <Badge tone="slate">Memeriksa…</Badge>
            ) : (
              <Badge tone="amber" dot>Perlu masuk ulang</Badge>
            )
          ) : (
            <Badge tone="slate">Belum terhubung</Badge>
          )}
        </div>
        <ul className="muted grid gap-2 border-t hairline px-4 py-3 text-xs sm:grid-cols-3 sm:px-5">
          <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-ink-3" /><span>Dihubungkan lewat email yang sama: <b className="break-all text-ink dark:text-white">{user?.email}</b></span></li>
          <li className="flex gap-2"><RefreshCw className="h-4 w-4 shrink-0 text-ink-3" />Order dipulihkan/dihapus/diubah → pemasukan di MoneyOut ikut menyesuaikan.</li>
          <li className="flex gap-2"><Link2 className="h-4 w-4 shrink-0 text-ink-3" />Satu arah: OrderBook → MoneyOut. Data MoneyOut lain tidak disentuh.</li>
        </ul>
      </Card>

      {/* Langkah 1: masuk ke MoneyOut */}
      {!connected && (
        <Card>
          <CardHeader
            title={linked ? 'Masuk ulang ke MoneyOut di perangkat ini' : 'Langkah 1 · Masuk ke akun MoneyOut'}
            subtitle={
              mo.session === 'mismatch'
                ? 'Sesi MoneyOut di browser ini memakai email lain. Masuk dengan email OrderBook Anda.'
                : 'Pakai password akun MoneyOut Anda. Email harus sama dengan email OrderBook.'
            }
          />
          {loadingAcc ? (
            <p className="muted flex items-center gap-2 px-5 py-6 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Memuat akun MoneyOut…</p>
          ) : (
            <form onSubmit={connect} className="grid gap-4 px-4 pb-5 pt-4 sm:grid-cols-2 sm:px-5">
              <Field label="Email (sama dengan OrderBook)">
                <Input value={user?.email || ''} readOnly className="bg-slate-50 dark:bg-white/5" />
              </Field>
              <Field label="Password MoneyOut" hint="Password tidak disimpan oleh OrderBook.">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" required minLength={6} />
              </Field>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button type="submit" loading={connecting} disabled={!password}>
                  <Link2 className="h-4 w-4" /> Masuk & hubungkan
                </Button>
                <a href={`${MONEYOUT_WEB}/daftar/`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  Belum punya akun MoneyOut? Daftar dengan email {user?.email}
                </a>
              </div>
            </form>
          )}
        </Card>
      )}

      {connected && !account.active && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            Akun MoneyOut <b>{account.email}</b> sedang {STATUS_TEXT[account.status] || account.status}. Pemasukan baru bisa dikirim setelah akun aktif.
          </p>
        </div>
      )}

      {/* Langkah 2: pengaturan sinkron */}
      {connected && (
        <Card>
          <CardHeader
            title={linked ? 'Pengaturan sinkron' : 'Langkah 2 · Atur cara pencatatan'}
            subtitle={`Akun MoneyOut: ${account.email}${account.username ? ` (@${account.username})` : ''}`}
          />
          <div className="space-y-5 px-4 pb-5 pt-4 sm:px-5">
            <fieldset>
              <legend className="label">Dicatat sebagai</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {MODES.map((m) => (
                  <label
                    key={m.value}
                    className={clsx(
                      'flex cursor-pointer gap-3 rounded-lg border p-3 transition',
                      draft.mode === m.value ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'hairline hover:border-line-strong',
                    )}
                  >
                    <input type="radio" name="mode" value={m.value} checked={draft.mode === m.value} onChange={set('mode')} className="mt-0.5 accent-brand-500" />
                    <span>
                      <span className="block text-sm font-semibold">{m.label}</span>
                      <span className="muted block text-xs">{m.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kategori pemasukan" hint="Kategori di menu Pemasukan MoneyOut">
                <Select options={account.categories.map((c) => ({ value: c, label: c }))} value={draft.category} onChange={set('category')} />
              </Field>
              <Field label="Masuk ke dompet" hint={account.wallets.length ? 'Saldo dompet ini bertambah' : 'Belum ada dompet di MoneyOut'}>
                <Select
                  options={account.wallets.map((w) => ({ value: w.id, label: w.name }))}
                  placeholder="Tanpa dompet"
                  value={draft.wallet_id || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, wallet_id: e.target.value || null }))}
                />
              </Field>
              <Field label="Mulai dari tanggal selesai" hint="Order selesai sebelum tanggal ini tidak dikirim">
                <Input type="date" value={draft.since} onChange={set('since')} max={formatDate(new Date(), 'yyyy-MM-dd')} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] dark:bg-white/5">
              <span className="muted">
                Akan tercatat di MoneyOut: <b className="num text-ink dark:text-white">{preview.count}</b> pemasukan · total{' '}
                <b className="num text-ink dark:text-white">{formatRupiah(preview.total)}</b>
              </span>
              <Button onClick={save} loading={saving} disabled={!account.active}>
                <CheckCircle2 className="h-4 w-4" /> {linked ? 'Simpan & sinkronkan' : 'Hubungkan & kirim'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Status sinkron */}
      {linked && (
        <Card>
          <CardHeader
            title="Status sinkron"
            subtitle={`Terhubung sejak ${formatDate(mo.cfg.linked_at)} · ${MODES.find((m) => m.value === mo.cfg.mode)?.label} · ${mo.cfg.category}${mo.cfg.wallet_name ? ` · ${mo.cfg.wallet_name}` : ''}`}
            action={
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => mo.syncNow()} loading={mo.running} disabled={mo.session !== 'ok'}>
                  {!mo.running && <RefreshCw className="h-3.5 w-3.5" />} Sinkronkan
                </Button>
                <a href={MONEYOUT_WEB + '/pemasukan/'} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-[13px] font-semibold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                  Buka <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            }
          />
          <div className="px-4 pb-4 pt-3 text-[13px] sm:px-5">
            {mo.error ? (
              <p className="flex items-start gap-2 text-[#c13030] dark:text-[#f07b7b]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{mo.error}</p>
            ) : last ? (
              <p className="muted">
                Terakhir {formatDateTime(last.at)}: {last.rows} pemasukan senilai <b className="num">{formatRupiah(last.total)}</b> di MoneyOut
                {last.added || last.updated || last.removed ? ` (+${last.added} baru, ${last.updated} diubah, ${last.removed} dihapus)` : ' (tidak ada perubahan)'}.
              </p>
            ) : (
              <p className="muted">Belum pernah disinkronkan di perangkat ini.</p>
            )}
            <p className="faint mt-2 text-xs">
              Sinkron berjalan otomatis beberapa detik setelah order berubah, selama perangkat ini masuk ke MoneyOut. Transaksi dari OrderBook di MoneyOut
              berawalan “OrderBook ·”; ubahlah lewat OrderBook, karena perubahan langsung di MoneyOut akan ditimpa saat sinkron berikutnya.
            </p>
          </div>
          <div className="flex justify-end border-t hairline px-4 py-2.5 sm:px-5">
            <Button size="sm" variant="danger-ghost" onClick={unlink}>
              <Link2Off className="h-3.5 w-3.5" /> Putuskan hubungan
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
