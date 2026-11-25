import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'
import { moSession, moSync, readConfig, readLast, writeLast } from '@/lib/moneyout'

/**
 * Menjalankan sinkronisasi OrderBook → MoneyOut otomatis.
 * Dipicu saat data order yang relevan berubah (selesai, dipulihkan, harga diubah, dihapus)
 * atau saat pengaturan hubungan berubah. Diberi jeda 1,5 detik supaya perubahan beruntun
 * (mis. aksi massal) cukup dikirim sekali.
 */
const Ctx = createContext(null)

export function MoneyOutProvider({ children }) {
  const { user } = useAuth()
  const { orders, loading } = useData()
  const cfg = useMemo(() => readConfig(user), [user])
  const [state, setState] = useState({ session: 'unknown', running: false, error: null, last: readLast() })
  const running = useRef(false)
  const pending = useRef(false)
  const lastKey = useRef(null)
  const ordersRef = useRef(orders)
  ordersRef.current = orders
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  // Tanda tangan data yang memengaruhi MoneyOut — sinkron hanya bila berubah.
  const signature = useMemo(() => {
    const done = orders
      .filter((o) => o.status === 'selesai')
      .map((o) => `${o.id}|${o.completed_at}|${o.price}|${o.task_name}`)
      .sort()
      .join(';')
    return `${cfg.linked}|${cfg.mode}|${cfg.category}|${cfg.wallet_id}|${cfg.since}::${done}`
  }, [orders, cfg])

  const run = useCallback(
    async ({ manual = false } = {}) => {
      const c = cfgRef.current
      if (!c.linked) return null
      if (running.current) {
        pending.current = true
        return null
      }
      running.current = true
      setState((s) => ({ ...s, running: true, error: null }))
      try {
        const sess = await moSession(user?.email)
        if (sess.state !== 'ok') {
          setState((s) => ({ ...s, session: sess.state, running: false }))
          if (manual) toast.error(sess.state === 'mismatch' ? 'Sesi MoneyOut memakai email lain. Hubungkan ulang.' : 'Sesi MoneyOut berakhir. Masuk ulang di Pengaturan → Aplikasi terhubung.')
          return null
        }
        const res = await moSync(ordersRef.current, c)
        writeLast(res)
        setState((s) => ({ ...s, session: 'ok', running: false, error: null, last: res }))
        if (manual) toast.success(res.added || res.updated || res.removed ? `MoneyOut diperbarui: +${res.added} baru, ${res.updated} diubah, ${res.removed} dihapus` : 'MoneyOut sudah sama dengan OrderBook')
        else if (res.added || res.updated || res.removed) toast.message('Pemasukan MoneyOut diperbarui', { description: `+${res.added} baru · ${res.updated} diubah · ${res.removed} dihapus` })
        return res
      } catch (e) {
        setState((s) => ({ ...s, running: false, error: e.message }))
        if (manual) toast.error(e.message)
        return null
      } finally {
        running.current = false
        if (pending.current) {
          pending.current = false
          setTimeout(() => run(), 500)
        }
      }
    },
    [user?.email],
  )

  useEffect(() => {
    if (loading || !cfg.linked || !user) return
    if (lastKey.current === signature) return
    const t = setTimeout(() => {
      lastKey.current = signature
      run()
    }, 1500)
    return () => clearTimeout(t)
  }, [signature, loading, cfg.linked, user, run])

  /** Simpan pengaturan hubungan ke metadata akun OrderBook. */
  const saveConfig = useCallback(
    async (patch) => {
      const next = { ...cfgRef.current, ...patch }
      const { error } = await supabase.auth.updateUser({ data: { moneyout: next } })
      if (error) throw error
      lastKey.current = null // paksa sinkron ulang dengan pengaturan baru
      return next
    },
    [],
  )

  const value = useMemo(() => ({ cfg, ...state, syncNow: () => run({ manual: true }), saveConfig, refreshSession: async () => {
    const s = await moSession(user?.email)
    setState((x) => ({ ...x, session: s.state }))
    return s
  } }), [cfg, state, run, saveConfig, user?.email])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useMoneyOut = () => useContext(Ctx)
