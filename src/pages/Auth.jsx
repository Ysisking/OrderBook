import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { supabase, errorMessage } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button, Field, Input } from '@/components/ui'

const USERNAME_RE = /^[A-Za-z0-9_]{4,20}$/
export const passwordProblem = (p) =>
  p.length < 8 ? 'Minimal 8 karakter' : !/\d/.test(p) || !/[A-Za-z]/.test(p) ? 'Harus berisi huruf dan angka' : ''

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4 dark:from-[#10213a] dark:via-[#121211] dark:to-[#121211]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <span className="text-xl font-extrabold tracking-tight">OrderBook</span>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-extrabold">{title}</h1>
          {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="muted mt-5 text-center text-sm">{footer}</p>}
      </div>
    </div>
  )
}

function PasswordInput(props) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-3 hover:text-ink"
        aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: email, error: e1 } = await supabase.rpc('email_for_login', { p_identifier: identifier.trim() })
      if (e1) throw e1
      if (!email) throw new Error('Invalid login credentials')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      nav('/', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell
      title="Masuk"
      subtitle="Kelola pesanan, pelanggan, dan laporan usaha Anda."
      footer={
        <>
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Daftar gratis
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email atau username">
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required autoFocus />
        </Field>
        <Field label="Kata sandi">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link to="/lupa-sandi" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Lupa kata sandi?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Masuk
        </Button>
      </form>
    </Shell>
  )
}

export function Register() {
  const [v, setV] = useState({ email: '', username: '', business_name: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const nav = useNavigate()
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errs.email = 'Email tidak valid'
    if (!USERNAME_RE.test(v.username)) errs.username = '4–20 karakter: huruf, angka, garis bawah'
    const pp = passwordProblem(v.password)
    if (pp) errs.password = pp
    if (v.password !== v.confirm) errs.confirm = 'Kata sandi tidak sama'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    try {
      const { data: free, error: e1 } = await supabase.rpc('username_available', { p_username: v.username })
      if (e1) throw e1
      if (!free) {
        setErrors({ username: 'Username sudah dipakai' })
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email: v.email.trim().toLowerCase(),
        password: v.password,
        options: {
          data: { username: v.username, business_name: v.business_name.trim() },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      if (data.session) nav('/', { replace: true })
      else setSentTo(v.email)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (sentTo)
    return (
      <Shell title="Cek email Anda" footer={<Link to="/masuk" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Kembali ke halaman masuk</Link>}>
        <div className="flex gap-3">
          <MailCheck className="h-6 w-6 shrink-0 text-brand-500" />
          <p className="muted text-sm leading-relaxed">
            Link konfirmasi telah dikirim ke <b className="text-ink dark:text-white">{sentTo}</b>. Klik link tersebut untuk mengaktifkan akun, lalu masuk.
            Cek folder spam jika tidak ada di kotak masuk.
          </p>
        </div>
      </Shell>
    )

  return (
    <Shell
      title="Buat akun"
      subtitle="Data Anda tersimpan terpisah dan hanya bisa diakses oleh akun Anda."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link to="/masuk" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" error={errors.email} required>
          <Input type="email" value={v.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Username" error={errors.username} hint="Bisa dipakai untuk masuk" required>
          <Input value={v.username} onChange={set('username')} autoComplete="username" placeholder="mis. taufik_dev" />
        </Field>
        <Field label="Nama usaha">
          <Input value={v.business_name} onChange={set('business_name')} placeholder="mis. Jasa Tugas Taufik" maxLength={80} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kata sandi" error={errors.password} required>
            <PasswordInput value={v.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="Ulangi kata sandi" error={errors.confirm} required>
            <PasswordInput value={v.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </Field>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Daftar
        </Button>
      </form>
    </Shell>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-sandi`,
    })
    setLoading(false)
    if (error) toast.error(errorMessage(error))
    else setSent(true)
  }
  return (
    <Shell title="Lupa kata sandi" subtitle="Kami kirim link untuk membuat kata sandi baru." footer={<Link to="/masuk" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Kembali ke halaman masuk</Link>}>
      {sent ? (
        <p className="muted text-sm">Jika email terdaftar, link reset sudah dikirim ke <b>{email}</b>.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email akun">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Button type="submit" className="w-full" loading={loading}>
            Kirim link reset
          </Button>
        </form>
      )}
    </Shell>
  )
}

export function ResetPassword() {
  const { session, setRecovery } = useAuth()
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const submit = async (e) => {
    e.preventDefault()
    const pp = passwordProblem(p)
    if (pp) return toast.error(pp)
    if (p !== c) return toast.error('Kata sandi tidak sama')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: p })
    setLoading(false)
    if (error) return toast.error(errorMessage(error))
    setRecovery(false)
    toast.success('Kata sandi berhasil diganti')
    nav('/', { replace: true })
  }
  return (
    <Shell title="Buat kata sandi baru">
      {!session ? (
        <p className="muted text-sm">
          Link tidak valid atau sudah kedaluwarsa. <Link to="/lupa-sandi" className="font-semibold text-brand-600">Minta link baru</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Kata sandi baru">
            <PasswordInput value={p} onChange={(e) => setP(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Ulangi kata sandi baru">
            <PasswordInput value={c} onChange={(e) => setC(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button type="submit" className="w-full" loading={loading}>
            Simpan
          </Button>
        </form>
      )}
    </Shell>
  )
}

export { PasswordInput }
