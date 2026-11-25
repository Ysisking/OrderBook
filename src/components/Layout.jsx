import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  ClipboardList,
  History,
  Home,
  Link2,
  LogOut,
  Menu as MenuIcon,
  MessageSquareQuote,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserRoundCheck,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUI } from '@/context/UIContext'
import { Avatar, Kbd, MOD, Menu } from './ui'
import OrderForm from './OrderForm'
import OrderDetail from './OrderDetail'
import CommandPalette from './CommandPalette'
import { deadlineState, isActive } from '@/lib/analytics'

/** Menu dikelompokkan seperti Linear/Shopify: kerja harian → pelanggan → analisis. */
export function useNavItems() {
  const { labels: L } = useAuth()
  return useMemo(
    () => [
      { to: '/', label: 'Beranda', icon: Home, end: true, group: 'Operasional' },
      { to: '/purchase-order', label: L.menu_po, icon: ClipboardList, badge: 'active', group: 'Operasional' },
      { to: '/riwayat', label: 'Riwayat', icon: History, group: 'Operasional' },
      { to: '/performa', label: `Performa ${L.customer}`, icon: UserRoundCheck, group: L.customer },
      { to: '/ulasan', label: 'Ulasan', icon: MessageSquareQuote, group: L.customer },
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3, group: 'Analisis' },
      { to: '/data-analyst', label: 'Data Analyst', icon: Bot, soon: true, group: 'Analisis' },
      { to: '/pengaturan', label: 'Pengaturan', icon: Settings, group: 'Akun' },
      { to: '/pengaturan/integrasi', label: 'Aplikasi terhubung (MoneyOut)', icon: Link2, group: 'Akun' },
    ],
    [L],
  )
}

function NavList({ onNavigate, urgent, active }) {
  const items = useNavItems().filter((i) => i.group !== 'Akun')
  const groups = [...new Set(items.map((i) => i.group))]
  return (
    <nav aria-label="Menu utama">
      {groups.map((g) => (
        <div key={g}>
          <p className="section-label">{g}</p>
          <div className="space-y-px">
            {items
              .filter((i) => i.group === g)
              .map((it) => (
                <NavItem key={it.to} it={it} onNavigate={onNavigate} active={active} urgent={urgent} />
              ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function NavItem({ it, onNavigate, active, urgent }) {
  return (
    <NavLink
      to={it.to}
      end={it.end}
      onClick={onNavigate}
      className={({ isActive: on }) =>
        clsx(
          'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition',
          on
            ? 'bg-white text-ink shadow-[0_0_0_1px_theme(colors.line.DEFAULT),0_1px_2px_rgba(0,0,0,.04)] dark:bg-white/10 dark:text-white dark:shadow-none'
            : 'text-ink-2 hover:bg-black/[.04] hover:text-ink dark:text-[#b9b8b1] dark:hover:bg-white/5 dark:hover:text-white',
        )
      }
    >
      {({ isActive: on }) => (
        <>
          <it.icon className={clsx('h-4 w-4 shrink-0', on ? 'text-brand-500' : 'text-ink-3 group-hover:text-ink-2 dark:text-[#85847e]')} />
          <span className="truncate">{it.label}</span>
          {it.badge === 'active' && active > 0 && (
            <span
              className={clsx(
                'num ml-auto rounded px-1.5 text-[11px] font-semibold',
                urgent ? 'bg-red-50 text-[#c13030] dark:bg-red-500/15 dark:text-[#f07b7b]' : 'text-ink-3',
              )}
              title={urgent ? `${urgent} order mendekati/lewat deadline` : `${active} order aktif`}
            >
              {active}
            </span>
          )}
          {it.soon && (
            <span className="ml-auto rounded bg-violet-50 px-1.5 text-[10px] font-bold uppercase text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              Segera
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function Brand({ compact }) {
  const { profile, labels: L } = useAuth()
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img src="/favicon.svg" alt="" className={compact ? 'h-7 w-7' : 'h-8 w-8'} />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-bold leading-tight">{profile?.business_name || L.app_name}</p>
        {!compact && <p className="faint text-[11px] font-medium">OrderBook</p>}
      </div>
    </div>
  )
}

function UserMenu({ placement = 'sidebar' }) {
  const { profile, user, signOut, settings, updateSettings } = useAuth()
  const nav = useNavigate()
  const dark = document.documentElement.classList.contains('dark')
  return (
    <Menu
      width={240}
      align={placement === 'sidebar' ? 'start' : 'end'}
      header={user?.email}
      items={[
        { label: 'Profil', icon: UserRoundCheck, onSelect: () => nav('/pengaturan/profil') },
        { label: 'Pengaturan', icon: Settings, onSelect: () => nav('/pengaturan') },
        { label: 'Aplikasi terhubung', icon: Link2, onSelect: () => nav('/pengaturan/integrasi') },
        { label: dark ? 'Mode terang' : 'Mode gelap', icon: dark ? Sun : Moon, onSelect: () => updateSettings({ theme: dark ? 'light' : 'dark' }) },
        'divider',
        {
          label: 'Keluar',
          icon: LogOut,
          danger: true,
          onSelect: async () => {
            await signOut()
            nav('/masuk')
          },
        },
      ]}
      trigger={(p) =>
        placement === 'sidebar' ? (
          <button {...p} className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-black/[.04] dark:hover:bg-white/5">
            <Avatar src={profile?.avatar_url} name={profile?.business_name || profile?.username} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">@{profile?.username}</span>
              <span className="faint block truncate text-[11px]">{settings?.theme === 'system' ? 'Tema sistem' : user?.email}</span>
            </span>
          </button>
        ) : (
          <button {...p} className="rounded-full" aria-label="Akun">
            <Avatar src={profile?.avatar_url} name={profile?.business_name || profile?.username} size={30} />
          </button>
        )
      }
    />
  )
}

/** Pintasan keyboard global: N = order baru, Ctrl/⌘K = palet perintah, / = cari. */
function useShortcuts() {
  const { newOrder, setPalette, form, detailId } = useUI()
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      const typing = t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
        return
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || form.open) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        newOrder()
      } else if (e.key === '/' && !detailId) {
        const search = document.querySelector('[data-page-search]')
        if (search) {
          e.preventDefault()
          search.focus()
        } else {
          e.preventDefault()
          setPalette(true)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [newOrder, setPalette, form.open, detailId])
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const { orders } = useData()
  const { settings, labels: L } = useAuth()
  const ui = useUI()
  useShortcuts()
  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => ui.closeOrder(), [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeOrders = orders.filter(isActive)
  const urgent = activeOrders.filter((o) => ['soon', 'overdue'].includes(deadlineState(o, settings.deadline_warning_days))).length

  const sidebarBody = (onNavigate) => (
    <>
      <div className="space-y-1.5 px-1">
        <button
          onClick={() => ui.setPalette(true)}
          className="flex h-8 w-full items-center gap-2 rounded-md border border-line bg-white px-2.5 text-[13px] text-ink-3 transition hover:border-line-strong dark:border-white/10 dark:bg-white/5 dark:text-[#85847e]"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Cari…</span>
          <Kbd>{MOD}</Kbd>
          <Kbd>K</Kbd>
        </button>
        <button
          onClick={() => {
            onNavigate?.()
            ui.newOrder()
          }}
          className="flex h-8 w-full items-center gap-2 rounded-md bg-brand-500 px-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          <span className="flex-1 text-left">{L.order} baru</span>
          <kbd className="rounded border border-white/30 px-1 text-[10px] font-semibold text-white/80">N</kbd>
        </button>
      </div>
      <div className="no-scrollbar mt-1 flex-1 overflow-y-auto px-1">
        <NavList active={activeOrders.length} urgent={urgent} onNavigate={onNavigate} />
      </div>
      <div className="space-y-px border-t hairline px-1 pt-2">
        <NavItem it={{ to: '/pengaturan', label: 'Pengaturan', icon: Settings }} onNavigate={onNavigate} />
        <UserMenu />
      </div>
    </>
  )

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-3 border-r hairline bg-[#f1f1ee] px-2 py-3 dark:bg-[#141413] lg:flex">
        <div className="px-2 pb-1 pt-0.5">
          <Brand />
        </div>
        {sidebarBody()}
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b hairline bg-white/90 px-3 backdrop-blur dark:bg-surface-dark/90 lg:hidden">
        <div className="min-w-0 flex-1">
          <Brand compact />
        </div>
        <button onClick={() => ui.setPalette(true)} className="rounded-md p-2 text-ink-2 hover:bg-slate-100 dark:text-[#b9b8b1] dark:hover:bg-white/5" aria-label="Cari">
          <Search className="h-5 w-5" />
        </button>
        <UserMenu placement="top" />
      </header>

      {/* Drawer mobile (menu lengkap) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs animate-slide-in flex-col gap-3 bg-[#f1f1ee] px-2 py-3 shadow-pop dark:bg-[#141413]">
            <div className="flex items-center justify-between px-2">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5" aria-label="Tutup menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarBody(() => setOpen(false))}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-7">
        <div className="mx-auto max-w-[1240px]">
          <Outlet />
        </div>
      </main>

      {/* Tab bar bawah (HP) — pola aplikasi kasir/POS */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t hairline bg-white/95 backdrop-blur dark:bg-surface-dark/95 lg:hidden" aria-label="Navigasi bawah">
        <div className="grid h-16 grid-cols-5 items-center">
          <TabLink to="/" end icon={Home} label="Beranda" />
          <TabLink to="/purchase-order" icon={ClipboardList} label="Order" badge={activeOrders.length} alert={urgent > 0} />
          <div className="flex justify-center">
            <button
              onClick={() => ui.newOrder()}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-pop ring-4 ring-canvas transition active:scale-95 dark:ring-canvas-dark"
              aria-label={`${L.order} baru`}
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          <TabLink to="/riwayat" icon={History} label="Riwayat" />
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-ink-3 dark:text-[#85847e]">
            <MenuIcon className="h-5 w-5" />
            Menu
          </button>
        </div>
      </nav>

      <OrderForm open={ui.form.open} onClose={ui.closeForm} order={ui.form.order} defaults={ui.form.defaults} />
      <OrderDetail />
      <CommandPalette />
    </div>
  )
}

function TabLink({ to, end, icon: Icon, label, badge, alert }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx('relative flex flex-col items-center gap-0.5 text-[11px] font-medium', isActive ? 'text-brand-600 dark:text-brand-300' : 'text-ink-3 dark:text-[#85847e]')
      }
    >
      <Icon className="h-5 w-5" />
      {label}
      {badge > 0 && (
        <span
          className={clsx(
            'num absolute -top-1 left-1/2 ml-2 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px]',
            alert ? 'bg-[#d03b3b] text-white' : 'bg-slate-200 text-ink-2 dark:bg-white/15 dark:text-white',
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}
