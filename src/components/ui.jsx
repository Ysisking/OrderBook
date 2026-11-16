import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown, Loader2, X, AlertTriangle } from 'lucide-react'
import { initials } from '@/lib/format'

export { clsx }

// ---------------------------------------------------------------- Button
const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  secondary:
    'border border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/15 dark:bg-[#232322] dark:text-[#f0efec] dark:hover:bg-[#2c2c2a]',
  ghost: 'text-ink-2 hover:bg-slate-100 dark:text-[#c3c2b7] dark:hover:bg-white/5',
  danger: 'bg-[#d03b3b] text-white hover:bg-[#b83232] shadow-sm',
}
const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', icon: 'h-9 w-9 justify-center' }

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- Form fields
export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={clsx('block', className)}>
      {label && (
        <span className="label">
          {label}
          {required && <span className="text-[#d03b3b]"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-[#d03b3b]">{error}</span>
      ) : hint ? (
        <span className="faint mt-1 block text-xs">{hint}</span>
      ) : null}
    </label>
  )
}

export const Input = ({ className, ...p }) => <input className={clsx('input', className)} {...p} />
export const Textarea = ({ className, ...p }) => <textarea className={clsx('input min-h-[88px] resize-y', className)} {...p} />

export function Select({ options, placeholder, className, ...p }) {
  return (
    <div className="relative">
      <select className={clsx('input appearance-none pr-9', className)} {...p}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
    </div>
  )
}

/** Dropdown dengan ceklis (pilih banyak). */
export function MultiSelect({ options, value = [], onChange, placeholder = 'Pilih…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const selected = options.filter((o) => value.includes(o.value))
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex min-h-[42px] items-center justify-between gap-2 text-left"
      >
        <span className={clsx('line-clamp-2', !selected.length && 'text-slate-400')}>
          {selected.length ? selected.map((s) => s.label).join(', ') : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected.length > 0 && (
            <span className="rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">{selected.length}</span>
          )}
          <ChevronDown className="h-4 w-4 text-ink-3" />
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#232322]">
          {options.map((o) => {
            const on = value.includes(o.value)
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <span
                  className={clsx(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    on ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-white/25',
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-start justify-between gap-4 text-left">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="muted mt-0.5 block text-xs">{description}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        className={clsx(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/20',
        )}
      >
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

// ---------------------------------------------------------------- Layout bits
export function Card({ className, children, ...p }) {
  return (
    <div className={clsx('card', className)} {...p}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold">{title}</h3>
        {subtitle && <p className="muted mt-0.5 text-xs">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  )
}

const tones = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
  blue: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
}
export function Badge({ tone = 'slate', children, className, icon: Icon }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'brand', children }) {
  const acc = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  }[accent]
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="muted text-xs font-semibold">{label}</p>
        {Icon && (
          <span className={clsx('rounded-lg p-1.5', acc)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="num mt-1.5 truncate text-xl font-extrabold tracking-tight sm:text-2xl">{value}</p>
      {sub && <p className="faint mt-0.5 text-xs">{sub}</p>}
      {children}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 rounded-2xl bg-slate-100 p-3 text-ink-3 dark:bg-white/5">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-bold">{title}</p>
      {description && <p className="muted mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export const Spinner = ({ className }) => <Loader2 className={clsx('h-5 w-5 animate-spin text-brand-500', className)} />

export function FullLoader({ text = 'Memuat…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-7 w-7" />
      <p className="muted text-sm">{text}</p>
    </div>
  )
}

export function Avatar({ src, name, size = 40 }) {
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-white/10" />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-500 font-bold text-white"
    >
      {initials(name)}
    </span>
  )
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={clsx('scrollbar-thin flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-white/5', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition',
            value === t.value
              ? 'bg-white text-ink shadow-sm dark:bg-[#2c2c2a] dark:text-white'
              : 'text-ink-2 hover:text-ink dark:text-[#c3c2b7] dark:hover:text-white',
          )}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
          {t.count !== undefined && (
            <span className="num rounded-full bg-slate-200 px-1.5 text-[11px] dark:bg-white/10">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Modal
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-surface-dark sm:rounded-2xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-white/10">{footer}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Confirm dialog (promise-based)
const ConfirmCtx = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const confirm = useCallback(
    (opts) => new Promise((resolve) => setState({ ...opts, resolve })),
    [],
  )
  const close = (v) => {
    state?.resolve(v)
    setState(null)
  }
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title || 'Konfirmasi'}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Batal
            </Button>
            <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {state?.confirmText || 'Ya, lanjutkan'}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          {state?.danger && (
            <span className="h-fit rounded-xl bg-red-50 p-2 text-[#d03b3b] dark:bg-red-500/15">
              <AlertTriangle className="h-5 w-5" />
            </span>
          )}
          <p className="muted text-sm leading-relaxed">{state?.message}</p>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  )
}
export const useConfirm = () => useContext(ConfirmCtx)
