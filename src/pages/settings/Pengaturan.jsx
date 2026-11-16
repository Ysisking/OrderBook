import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import clsx from 'clsx'
import { Lock, Monitor, SlidersHorizontal, UserCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui'
import Profil from './Profil'
import SetUp from './SetUp'
import Tampilan from './Tampilan'
import Privasi from './Privasi'

const TABS = [
  { to: 'profil', label: 'Profil', icon: UserCircle2 },
  { to: 'setup', label: 'Set Up', icon: SlidersHorizontal },
  { to: 'tampilan', label: 'Mode Tampilan', icon: Monitor },
  { to: 'privasi', label: 'Privasi', icon: Lock },
]

export default function Pengaturan() {
  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Profil usaha, penyesuaian jenis usaha, tampilan, dan keamanan akun." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                clsx(
                  'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  isActive ? 'bg-white text-brand-600 shadow-card dark:bg-surface-dark dark:text-brand-300' : 'text-ink-2 hover:bg-white/60 dark:text-[#c3c2b7] dark:hover:bg-white/5',
                )
              }
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Routes>
            <Route index element={<Navigate to="profil" replace />} />
            <Route path="profil" element={<Profil />} />
            <Route path="setup" element={<SetUp />} />
            <Route path="tampilan" element={<Tampilan />} />
            <Route path="privasi" element={<Privasi />} />
            <Route path="*" element={<Navigate to="profil" replace />} />
          </Routes>
        </div>
      </div>
    </>
  )
}
