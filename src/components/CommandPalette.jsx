import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Moon, Plus, Search, Sun, FileText } from 'lucide-react'
import { clsx } from './ui'
import { useNavItems } from './Layout'
import { StatusBadge } from './orderBits'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { formatRupiah, prettyPhone } from '@/lib/format'

/**
 * Command palette (Ctrl/⌘ K) — pola Linear/Raycast.
 * Satu kotak untuk: lompat ke menu, mencari order (nama tugas, pelanggan, PO, no HP), dan aksi cepat.
 */
export default function CommandPalette() {
  const { palette, setPalette, newOrder, openOrder } = useUI()
  const { orders } = useData()
  const { settings, updateSettings } = useAuth()
  const nav = useNavigate()
  const navItems = useNavItems()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef(null)

  useEffect(() => {
    if (palette) {
      setQ('')
      setActive(0)
    }
  }, [palette])

  const dark = document.documentElement.classList.contains('dark')

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '').replace(/^0/, '')
    const match = (s) => !needle || s.toLowerCase().includes(needle)

    const actions = [
      { group: 'Aksi', id: 'new', label: 'Buat order baru', icon: Plus, hint: 'N', run: () => newOrder() },
      {
        group: 'Aksi',
        id: 'theme',
        label: dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap',
        icon: dark ? Sun : Moon,
        run: () => updateSettings({ theme: dark ? 'light' : 'dark' }),
      },
    ].filter((a) => match(a.label))

    const pages = navItems
      .filter((n) => match(n.label))
      .map((n) => ({ group: 'Menu', id: `nav-${n.to}`, label: n.label, icon: n.icon, run: () => nav(n.to) }))

    const found = (needle
      ? orders.filter(
          (o) =>
            [o.task_name, o.customer_name, o.order_no, o.region].some((f) => f?.toLowerCase().includes(needle)) ||
            (digits.length >= 3 && o.phone_norm?.includes(digits)),
        )
      : orders.filter((o) => o.status !== 'selesai')
    )
      .slice(0, needle ? 8 : 5)
      .map((o) => ({
        group: needle ? 'Order' : 'Order aktif terbaru',
        id: o.id,
        label: o.task_name,
        sub: `${o.order_no} · ${o.customer_name || prettyPhone(o.phone)} · ${formatRupiah(o.price)}`,
        icon: FileText,
        order: o,
        run: () => openOrder(o.id),
      }))

    return needle ? [...found, ...actions, ...pages] : [...actions, ...found, ...pages]
  }, [q, orders, navItems, nav, newOrder, openOrder, dark, updateSettings])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!palette) return null
  const close = () => setPalette(false)
  const run = (r) => {
    close()
    r?.run()
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(results[active])
    } else if (e.key === 'Escape') {
      close()
    }
  }

  let lastGroup = null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Cari & perintah">
      <div className="absolute inset-0 animate-fade-in bg-black/30 dark:bg-black/60" onClick={close} />
      <div className="relative w-full max-w-xl animate-pop overflow-hidden rounded-xl border border-line bg-white shadow-pop dark:border-white/10 dark:bg-surface-dark">
        <div className="flex items-center gap-2.5 border-b hairline px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Cari order, pelanggan, no. HP, atau menu…"
            className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
          />
          <kbd className="kbd">Esc</kbd>
        </div>
        <ul id="cmdk-list" ref={listRef} role="listbox" className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="faint px-3 py-8 text-center text-sm">Tidak ada hasil untuk “{q}”.</li>}
          {results.map((r, i) => {
            const head = r.group !== lastGroup
            lastGroup = r.group
            return (
              <li key={r.id} role="option" aria-selected={i === active}>
                {head && <p className="faint px-2.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide">{r.group}</p>}
                <button
                  data-idx={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(r)}
                  className={clsx('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', i === active && 'bg-slate-100 dark:bg-white/10')}
                >
                  <r.icon className="h-4 w-4 shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    {r.sub && <span className="faint num block truncate text-xs">{r.sub}</span>}
                  </span>
                  {r.order && <StatusBadge status={r.order.status} />}
                  {r.hint && <kbd className="kbd">{r.hint}</kbd>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="faint flex items-center gap-3 border-t hairline px-4 py-2 text-[11px]">
          <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> pilih</span>
          <span><kbd className="kbd">Enter</kbd> buka</span>
          <span className="ml-auto">{settings?.theme === 'system' ? 'Tema: ikut sistem' : ''}</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
