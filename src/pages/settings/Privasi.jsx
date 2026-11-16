import { useState } from 'react'
import { toast } from 'sonner'
import { AtSign, KeyRound, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, CardHeader, Field, Input } from '@/components/ui'
import { PasswordInput, passwordProblem } from '@/pages/Auth'
import { supabase, errorMessage } from '@/lib/supabase'

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-500" />{title}</span>} subtitle={subtitle} />
      <div className="p-5">{children}</div>
    </Card>
  )
}

function ChangePassword() {
  const { user } = useAuth()
  const [v, setV] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const pp = passwordProblem(v.next)
    if (pp) return toast.error(`Kata sandi baru: ${pp.toLowerCase()}`)
    if (v.next !== v.confirm) return toast.error('Konfirmasi kata sandi tidak sama')
    if (v.next === v.current) return toast.error('Kata sandi baru harus berbeda')
    setBusy(true)
    try {
      // verifikasi kata sandi lama dulu
      const { error: e1 } = await supabase.auth.signInWithPassword({ email: user.email, password: v.current })
      if (e1) throw new Error('Kata sandi saat ini salah')
      const { error } = await supabase.auth.updateUser({ password: v.next })
      if (error) throw error
      toast.success('Kata sandi berhasil diubah')
      setV({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Section icon={KeyRound} title="Ubah kata sandi" subtitle="Minimal 8 karakter, kombinasi huruf dan angka.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <Field label="Kata sandi saat ini">
          <PasswordInput value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} autoComplete="current-password" required />
        </Field>
        <Field label="Kata sandi baru">
          <PasswordInput value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} autoComplete="new-password" required />
        </Field>
        <Field label="Ulangi kata sandi baru">
          <PasswordInput value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} autoComplete="new-password" required />
        </Field>
        <div className="flex justify-end sm:col-span-3">
          <Button type="submit" loading={busy}>Simpan kata sandi</Button>
        </div>
      </form>
    </Section>
  )
}

function ChangeUsername() {
  const { profile, updateProfile } = useAuth()
  const [u, setU] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!/^[A-Za-z0-9_]{4,20}$/.test(u)) return toast.error('Username 4–20 karakter: huruf, angka, garis bawah')
    if (u === profile.username) return toast.error('Username sama dengan yang sekarang')
    setBusy(true)
    try {
      const { data: free, error: e1 } = await supabase.rpc('username_available', { p_username: u })
      if (e1) throw e1
      if (!free) throw new Error('Username sudah dipakai akun lain.')
      await updateProfile({ username: u })
      toast.success(`Username diganti menjadi @${u}`)
      setU('')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Section icon={AtSign} title="Ubah username" subtitle={`Username saat ini: @${profile?.username}. Username baru langsung bisa dipakai untuk masuk.`}>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Username baru" className="flex-1">
          <Input value={u} onChange={(e) => setU(e.target.value.trim())} placeholder="username_baru" maxLength={20} />
        </Field>
        <Button type="submit" loading={busy}>Simpan</Button>
      </form>
    </Section>
  )
}

function ChangeEmail() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const next = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return toast.error('Email tidak valid')
    if (next === user.email) return toast.error('Email sama dengan yang sekarang')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: `${window.location.origin}/pengaturan/privasi` })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    toast.success('Link konfirmasi dikirim', { description: `Buka link di ${next} (dan email lama bila diminta) untuk menyelesaikan penggantian.`, duration: 8000 })
    setEmail('')
  }
  return (
    <Section icon={Mail} title="Ganti email" subtitle={`Email saat ini: ${user?.email}. Data Anda tetap terikat ke akun yang sama.`}>
      {user?.new_email && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Menunggu konfirmasi untuk <b>{user.new_email}</b>.
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Email baru" className="flex-1">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
        </Field>
        <Button type="submit" loading={busy}>Kirim konfirmasi</Button>
      </form>
    </Section>
  )
}

export default function Privasi() {
  return (
    <div className="space-y-4">
      <ChangePassword />
      <ChangeUsername />
      <ChangeEmail />
    </div>
  )
}
