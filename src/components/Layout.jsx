import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  ClipboardList,
  History,
  Home,
  LogOut,
  Menu,
  MessageSquareQuote,
  Settings,
  UserRoundCheck,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Avatar } from './ui'
import { deadlineState, isActive } from '@/lib/analytics'

export function useNavItems() {
  const { labels: L } = useAuth()
  return useMemo(
    () => [
      { to: '/', label: 'Beranda', icon: Home, end: true },
      { to: '/purchase-order', label: L.menu_po, icon: ClipboardList, badge: 'active' },
      { to: '/performa', label: `Performa ${L.customer}`, icon: UserRoundCheck },
      { to: '/ulasan', label: 'Ulasan', icon: MessageSquareQuote },
      { to: '/riwayat', label: 'Riwayat', icon: History },
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
      { to: '/data-analyst', label: 'Data Analyst', icon: Bot, soon: true },
      { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
    ],
    [L],
  )
}

function NavList({ onNavigate, urgent, active }) {
  const items = useNavItems()
  return (
    <nav className="space-y-0.5">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          onClick={onNavigate}
          className={({ isActive: on }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
              on
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-ink-2 hover:bg-slate-100 hover:text-ink dark:text-[#c3c2b7] dark:hover:bg-white/5 dark:hover:text-white',
            )
          }
        >
          {({ isActive: on }) => (
            <>
              <it.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{it.label}</span>
              {it.badge === 'active' && active > 0 && (
                <span
                  className={clsx(
                    'num ml-auto rounded-full px-1.5 text-[11px] font-bold',
                    on ? 'bg-white/25 text-white' : urgent ? 'bg-[#d03b3b] text-white' : 'bg-slate-200 dark:bg-white/10',
                  )}
                  title={urgent ? `${urgent} order mendekati/lewat deadline` : undefined}
                >
                  {active}
                </span>
              )}
              {it.soon && (
                <span className={clsx('ml-auto rounded-full px-1.5 text-[10px] font-bold uppercase', on ? 'bg-white/25' : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200')}>
                  Segera
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  const { profile, labels: L } = useAuth()
  return (
    <div className="flex items-center gap-2.5 px-2">
      <img src="/favicon.svg" alt="" className="h-9 w-9" />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-extrabold leading-tight">{profile?.business_name || L.app_name}</p>
        <p className="faint text-[11px] font-medium">Pencatatan Pesanan</p>
      </div>
    </div>
  )
}

function UserBox() {
  const { profile, user, signOut } = useAuth()
  const nav = useNavigate()
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 dark:border-white/10">
      <Avatar src={profile?.avatar_url} name={profile?.business_name || profile?.username} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">@{profile?.username}</p>
        <p className="faint truncate text-[11px]">{user?.email}</p>
      </div>
      <button
        onClick={async () => {
          await signOut()
          nav('/masuk')
        }}
        className="rounded-lg p-2 text-ink-3 hover:bg-slate-100 hover:text-[#d03b3b] dark:hover:bg-white/5"
        title="Keluar"
        aria-label="Keluar"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const { orders } = useData()
  const { settings } = useAuth()
  useEffect(() => setOpen(false), [loc.pathname])

  const activeOrders = orders.filter(isActive)
  const urgent = activeOrders.filter((o) => ['soon', 'overdue'].includes(deadlineState(o, settings.deadline_warning_days))).length

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-5 border-r border-slate-200 bg-white px-3 py-5 dark:border-white/10 dark:bg-surface-dark lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList active={activeOrders.length} urgent={urgent} />
        </div>
        <UserBox />
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-surface-dark/90 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="relative rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Buka menu">
          <Menu className="h-6 w-6" />
          {urgent > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#d03b3b] ring-2 ring-white dark:ring-surface-dark" />}
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col gap-5 bg-white px-3 py-5 shadow-2xl dark:bg-surface-dark">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Tutup menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList active={activeOrders.length} urgent={urgent} onNavigate={() => setOpen(false)} />
            </div>
            <UserBox />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
