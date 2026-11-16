import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_LABELS, DEFAULT_SETTINGS } from '@/lib/constants'

const AuthContext = createContext(null)

function applyTheme(theme) {
  try {
    localStorage.setItem('ob-theme', theme)
  } catch {
    /* storage bisa diblokir; tema tetap diterapkan */
  }
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  const loadAccount = useCallback(async (userId) => {
    const [p, s] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (p.data) setProfile(p.data)
    if (s.data) {
      setSettings({ ...DEFAULT_SETTINGS, ...s.data })
      applyTheme(s.data.theme)
    } else if (!s.error) {
      // Akun lama tanpa baris settings -> buat
      const { data } = await supabase.from('user_settings').insert({ user_id: userId }).select().single()
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) await loadAccount(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // jangan await di dalam callback (deadlock supabase-js)
        setTimeout(() => s && loadAccount(s.user.id), 0)
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setSettings(DEFAULT_SETTINGS)
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadAccount])

  // Ikuti perubahan tema OS saat mode "sistem"
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => applyTheme('system')
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [settings.theme])

  const updateSettings = useCallback(
    async (patch) => {
      const prev = settings
      const next = { ...settings, ...patch }
      setSettings(next)
      if ('theme' in patch) applyTheme(patch.theme)
      const { error } = await supabase.from('user_settings').update(patch).eq('user_id', session.user.id)
      if (error) {
        setSettings(prev)
        if ('theme' in patch) applyTheme(prev.theme)
        throw error
      }
    },
    [settings, session],
  )

  const updateProfile = useCallback(
    async (patch) => {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', session.user.id).select().single()
      if (error) throw error
      setProfile(data)
      return data
    },
    [session],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      settings,
      labels: { ...DEFAULT_LABELS, ...(settings.labels || {}) },
      levels: settings.task_levels?.length ? settings.task_levels : DEFAULT_SETTINGS.task_levels,
      loading,
      recovery,
      setRecovery,
      updateSettings,
      updateProfile,
      reloadAccount: () => session && loadAccount(session.user.id),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, settings, loading, recovery, updateSettings, updateProfile, loadAccount],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
