import { useEffect, useLayoutEffect, useRef, useState, createContext, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { Check, ChevronDown, Loader2, X, AlertTriangle } from 'lucide-react'
import { initials } from '@/lib/format'

export { clsx }

// ---------------------------------------------------------------- Button
const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]',
  secondary:
    'border border-line-strong bg-white text-ink hover:bg-slate-50 dark:border-white/10 dark:bg-surface-raised dark:text-[#edece8] dark:hover:bg-[#292927]',
  ghost: 'text-ink-2 hover:bg-slate-100 dark:text-[#c3c2b7] dark:hover:bg-white/5',
  danger: 'bg-[#d03b3b] text-white hover:bg-[#b83232]',
  'danger-ghost': 'text-[#c13030] hover:bg-red-50 dark:text-[#f07b7b] dark:hover:bg-red-500/10',
}
const sizes = { xs: 'h-7 px-2 text-xs gap-1', sm: 'h-8 px-2.5 text-[13px] gap-1.5', md: 'h-9 px-3.5 text-sm gap-2', lg: 'h-10 px-4 text-sm gap-2', icon: 'h-8 w-8 justify-center', 'icon-sm': 'h-7 w-7 justify-center' }

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
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
        className="input flex !h-auto min-h-[36px] items-center justify-between gap-2 py-1.5 text-left"
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
        <div className="absolute z-30 mt-1 max-h-64 w-full animate-pop overflow-auto rounded-lg border border-line bg-white p-1 shadow-pop dark:border-white/10 dark:bg-surface-raised">
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
    <div className={clsx('flex items-start justify-between gap-3 px-4 pt-4 sm:px-5', className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && <p className="muted mt-0.5 text-xs">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, action, eyebrow }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="faint mb-1 text-xs font-medium">{eyebrow}</p>}
        <h1 className="text-xl font-bold tracking-tight sm:text-[22px]">{title}</h1>
        {subtitle && <p className="muted mt-1 text-[13px]">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
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
const dots = { slate: 'bg-slate-400', blue: 'bg-brand-500', amber: 'bg-amber-500', green: 'bg-[#0ca30c]', red: 'bg-[#d03b3b]', violet: 'bg-violet-500' }
export function Badge({ tone = 'slate', children, className, icon: Icon, dot }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-semibold leading-4', tones[tone], className)}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}
export { dots as TONE_DOTS }

export function StatCard({ label, value, sub, icon: Icon, accent, children, className }) {
  const acc = accent && {
    green: 'text-[#0a8a0a] dark:text-[#4ccb4c]',
    amber: 'text-amber-600 dark:text-amber-300',
    red: 'text-[#c13030] dark:text-[#f07b7b]',
  }[accent]
  return (
    <div className={clsx('card p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="muted text-[13px] font-medium">{label}</p>
        {Icon && <Icon className={clsx('h-4 w-4', acc || 'text-ink-3 dark:text-[#85847e]')} />}
      </div>
      <p className="num mt-2 truncate text-[22px] font-bold leading-7 tracking-tight">{value}</p>
      {sub && <p className="faint mt-0.5 text-xs">{sub}</p>}
      {children}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 rounded-xl border border-line bg-white p-2.5 text-ink-3 dark:border-line-dark dark:bg-white/5">
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

export function Tabs({ tabs, value, onChange, className, variant = 'pill' }) {
  if (variant === 'underline') {
    return (
      <div className={clsx('no-scrollbar flex gap-4 overflow-x-auto border-b hairline', className)} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={clsx(
              '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-[13px] font-semibold transition',
              value === t.value
                ? 'border-ink text-ink dark:border-white dark:text-white'
                : 'border-transparent text-ink-3 hover:text-ink dark:text-[#85847e] dark:hover:text-white',
            )}
          >
            {t.icon && <t.icon className="h-3.5 w-3.5" />}
            {t.label}
            {t.count !== undefined && (
              <span className={clsx('num rounded px-1 text-[11px]', t.alert ? 'bg-red-50 text-[#c13030] dark:bg-red-500/15 dark:text-[#f07b7b]' : 'bg-slate-100 text-ink-2 dark:bg-white/10 dark:text-[#b9b8b1]')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className={clsx('no-scrollbar inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border hairline bg-white p-0.5 dark:bg-surface-dark', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          title={t.title}
          className={clsx(
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-semibold transition',
            value === t.value
              ? 'bg-slate-100 text-ink dark:bg-white/10 dark:text-white'
              : 'text-ink-3 hover:text-ink dark:text-[#85847e] dark:hover:text-white',
          )}
        >
          {t.icon && <t.icon className="h-3.5 w-3.5" />}
          {t.label}
          {t.count !== undefined && <span className="num faint text-[11px]">{t.count}</span>}
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
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl bg-white shadow-pop dark:bg-surface-dark sm:rounded-xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between border-b hairline px-5 py-3.5">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe flex justify-end gap-2 border-t hairline px-5 py-3">{footer}</div>}
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
            <span className="h-fit rounded-lg bg-red-50 p-2 text-[#d03b3b] dark:bg-red-500/15">
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

// ---------------------------------------------------------------- Kbd
export const Kbd = ({ children, className }) => <kbd className={clsx('kbd', className)}>{children}</kbd>
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
export const MOD = isMac ? '⌘' : 'Ctrl'

// ---------------------------------------------------------------- Checkbox
export function Checkbox({ checked, indeterminate, onChange, label, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className={clsx('h-4 w-4 cursor-pointer rounded border-line-strong accent-brand-500', className)}
    />
  )
}

// ---------------------------------------------------------------- Popover / Menu (portal, tidak terpotong tabel)
/**
 * <Menu trigger={(props) => <button {...props}>…</button>} items={[{label, icon, onSelect, danger, checked, hint}, 'divider']} />
 */
export function Menu({ trigger, items, align = 'end', width = 220, header }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const panel = useRef(null)
  const [active, setActive] = useState(-1)
  // Nilai terbaru disimpan di ref supaya efek tidak berjalan ulang setiap render (items dibuat ulang tiap render).
  const latest = useRef({ items, active, align, width })
  latest.current = { items, active, align, width }

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = btn.current?.getBoundingClientRect()
      if (!r) return
      const { align: al, width: w, items: its } = latest.current
      const h = panel.current?.offsetHeight || its.length * 34 + 12
      const below = window.innerHeight - r.bottom
      const top = below < h + 12 && r.top > h + 12 ? r.top - h - 6 : r.bottom + 6
      let left = al === 'end' ? r.right - w : r.left
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
      setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }))
    }
    place()
    const raf = requestAnimationFrame(place) // ukur ulang setelah panel tampil
    const close = (e) => {
      if (panel.current?.contains(e.target) || btn.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => {
      const { items: its, active: act } = latest.current
      const selectable = its.map((it, i) => (it && it !== 'divider' && !it.disabled ? i : -1)).filter((i) => i >= 0)
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        btn.current?.focus()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = selectable.indexOf(act)
        const next = e.key === 'ArrowDown' ? (idx + 1) % selectable.length : (idx - 1 + selectable.length) % selectable.length
        setActive(selectable[next])
      } else if (e.key === 'Enter' && act >= 0) {
        e.preventDefault()
        setOpen(false)
        its[act]?.onSelect?.()
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const toggle = (e) => {
    e.stopPropagation()
    setActive(-1)
    setOpen((o) => !o)
  }

  return (
    <>
      {trigger({ ref: btn, onClick: toggle, 'aria-haspopup': 'menu', 'aria-expanded': open })}
      {open &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
            className="fixed z-[70] animate-pop rounded-lg border border-line bg-white p-1 shadow-pop dark:border-white/10 dark:bg-surface-raised"
            onClick={(e) => e.stopPropagation()}
          >
            {header && <div className="faint px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide">{header}</div>}
            {items.map((it, i) =>
              !it ? null : it === 'divider' ? (
                <div key={`d${i}`} className="my-1 border-t hairline" />
              ) : (
                <button
                  key={it.label}
                  role="menuitem"
                  disabled={it.disabled}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    setOpen(false)
                    it.onSelect?.()
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium disabled:opacity-40',
                    active === i && 'bg-slate-100 dark:bg-white/10',
                    it.danger ? 'text-[#c13030] dark:text-[#f07b7b]' : 'text-ink dark:text-[#edece8]',
                  )}
                >
                  {it.dot ? <span className={clsx('h-2 w-2 shrink-0 rounded-full', it.dot)} /> : it.icon ? <it.icon className="h-4 w-4 shrink-0 opacity-70" /> : null}
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.checked && <Check className="h-4 w-4 shrink-0 text-brand-500" />}
                  {it.hint && <span className="faint shrink-0 text-[11px]">{it.hint}</span>}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

// ---------------------------------------------------------------- Drawer (panel samping kanan; bottom sheet di HP)
export function Drawer({ open, onClose, children, label = 'Detail', width = 460 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !document.querySelector('[role=dialog][aria-modal=true]') && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-40" aria-label={label}>
      <div className="absolute inset-0 animate-fade-in bg-black/25 dark:bg-black/50" onClick={onClose} />
      <aside
        role="complementary"
        style={{ '--w': `${width}px` }}
        className="absolute inset-x-0 bottom-0 flex max-h-[90vh] animate-slide-up flex-col rounded-t-2xl border-line bg-white shadow-pop dark:border-line-dark dark:bg-surface-dark sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[var(--w)] sm:max-w-[92vw] sm:animate-slide-in sm:rounded-none sm:border-l"
      >
        {children}
      </aside>
    </div>,
    document.body,
  )
}
