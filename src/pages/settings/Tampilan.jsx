import { toast } from 'sonner'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader } from '@/components/ui'
import { errorMessage } from '@/lib/supabase'

const MODES = [
  { value: 'light', label: 'Terang', icon: Sun, preview: 'bg-white border-slate-200', bar: 'bg-slate-200' },
  { value: 'dark', label: 'Gelap', icon: Moon, preview: 'bg-[#1a1a19] border-[#2c2c2a]', bar: 'bg-[#3a3a38]' },
  { value: 'system', label: 'Ikuti sistem', icon: Monitor, preview: 'bg-gradient-to-r from-white from-50% to-[#1a1a19] to-50% border-slate-300', bar: 'bg-slate-400/50' },
]

export default function Tampilan() {
  const { settings, updateSettings } = useAuth()
  const choose = async (theme) => {
    try {
      await updateSettings({ theme })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }
  return (
    <Card>
      <CardHeader title="Mode tampilan" subtitle="Tersimpan di akun Anda dan berlaku di semua perangkat." />
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {MODES.map((m) => {
          const on = settings.theme === m.value
          return (
            <button
              key={m.value}
              onClick={() => choose(m.value)}
              className={clsx('rounded-2xl border-2 p-3 text-left transition', on ? 'border-brand-500' : 'border-transparent hover:border-slate-300 dark:hover:border-white/15')}
            >
              <div className={clsx('h-24 rounded-xl border p-2.5', m.preview)}>
                <div className={clsx('h-2 w-1/2 rounded-full', m.bar)} />
                <div className={clsx('mt-2 h-2 w-3/4 rounded-full', m.bar)} />
                <div className="mt-3 h-6 w-1/3 rounded-md bg-brand-500" />
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-sm font-semibold">
                <m.icon className="h-4 w-4" /> {m.label}
                {on && <Check className="ml-auto h-4 w-4 text-brand-500" />}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
