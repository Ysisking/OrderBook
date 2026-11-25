import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import clsx from 'clsx'
import { Link2, Lock, Monitor, SlidersHorizontal, UserCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui'
import Profil from './Profil'
import SetUp from './SetUp'
import Tampilan from './Tampilan'
import Privasi from './Privasi'
import Integrasi from './Integrasi'

const TABS = [
  { to: 'profil', label: 'Profil', icon: UserCircle2 },
  { to: 'setup', label: 'Set Up', icon: SlidersHorizontal },
  { to: 'tampilan', label: 'Mode Tampilan', icon: Monitor },
  { to: 'privasi', label: 'Privasi', icon: Lock },
  { to: 'integrasi', label: 'Aplikasi terhubung', icon: Link2 },
]

export default function Pengaturan() {
  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Profil usaha, penyesuaian jenis usaha, tampilan, keamanan akun, dan aplikasi terhubung." />
      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                clsx(
                  'flex h-8 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition',
                  isActive
                    ? 'bg-white text-ink shadow-[0_0_0_1px_theme(colors.line.DEFAULT)] dark:bg-white/10 dark:text-white dark:shadow-none'
                    : 'text-ink-2 hover:bg-black/[.04] dark:text-[#b9b8b1] dark:hover:bg-white/5',
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
            <Route path="integrasi" element={<Integrasi />} />
            <Route path="*" element={<Navigate to="profil" replace />} />
          </Routes>
        </div>
      </div>
    </>
  )
}
