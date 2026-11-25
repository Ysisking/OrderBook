import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Status UI global: form order, panel detail order, dan command palette.
 * Dipakai lintas halaman (Beranda, Purchase Order, Riwayat, pintasan keyboard).
 */
const UICtx = createContext(null)

export function UIProvider({ children }) {
  const [form, setForm] = useState({ open: false, order: null, defaults: null })
  const [detailId, setDetailId] = useState(null)
  const [palette, setPalette] = useState(false)

  const newOrder = useCallback((defaults = null) => setForm({ open: true, order: null, defaults }), [])
  const editOrder = useCallback((order) => setForm({ open: true, order, defaults: null }), [])
  const closeForm = useCallback(() => setForm((f) => ({ ...f, open: false })), [])
  const openOrder = useCallback((id) => setDetailId(id), [])
  const closeOrder = useCallback(() => setDetailId(null), [])

  const value = useMemo(
    () => ({ form, newOrder, editOrder, closeForm, detailId, openOrder, closeOrder, palette, setPalette }),
    [form, newOrder, editOrder, closeForm, detailId, openOrder, closeOrder, palette],
  )
  return <UICtx.Provider value={value}>{children}</UICtx.Provider>
}

export const useUI = () => useContext(UICtx)
