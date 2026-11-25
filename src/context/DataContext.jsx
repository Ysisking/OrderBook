import { toast } from 'sonner'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { orderTimeKey } from '@/lib/analytics'
import { supabase, fetchAll } from '@/lib/supabase'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

const sortOrders = (list) => [...list].sort((a, b) => orderTimeKey(b).localeCompare(orderTimeKey(a)))

// Kolom order_date ditambahkan belakangan (supabase/migrations/2026-11-25_order_date.sql).
// Bila belum dijalankan di database, simpan tanpa kolom itu supaya aplikasi tetap jalan.
const missingOrderDate = (error) => /order_date/.test(error?.message || '') && ['PGRST204', '42703'].includes(error?.code)
let warnedOrderDate = false

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const [o, r, t] = await Promise.all([
        fetchAll('orders'),
        fetchAll('customer_reviews'),
        fetchAll('testimonials', { order: 'review_date' }),
      ])
      setOrders(o)
      setReviews(r)
      setTestimonials(t)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  // ---------- Orders ----------
  const saveOrder = useCallback(async (values, id) => {
    const send = (v) => (id ? supabase.from('orders').update(v).eq('id', id) : supabase.from('orders').insert(v)).select().single()
    let { data, error } = await send(values)
    if (error && 'order_date' in values && missingOrderDate(error)) {
      const { order_date, ...rest } = values // eslint-disable-line no-unused-vars
      ;({ data, error } = await send(rest))
      if (!error && !warnedOrderDate) {
        warnedOrderDate = true
        toast.warning('Tanggal transaksi belum tersimpan', { description: 'Kolom order_date belum ada di database. Jalankan SQL migrasi di Supabase → SQL Editor.' })
      }
    }
    if (error) throw error
    setOrders((list) => sortOrders(id ? list.map((o) => (o.id === id ? data : o)) : [data, ...list]))
    return data
  }, [])

  const setOrderStatus = useCallback((id, status) => saveOrder({ status }, id), [saveOrder])

  // Aksi massal (dipakai pilihan banyak baris di Purchase Order)
  const setStatusMany = useCallback(async (ids, status) => {
    const { data, error } = await supabase.from('orders').update({ status }).in('id', ids).select()
    if (error) throw error
    const byId = new Map(data.map((d) => [d.id, d]))
    setOrders((list) => sortOrders(list.map((o) => byId.get(o.id) || o)))
    return data
  }, [])

  const deleteMany = useCallback(async (ids) => {
    const { error } = await supabase.from('orders').delete().in('id', ids)
    if (error) throw error
    const set = new Set(ids)
    setOrders((list) => list.filter((o) => !set.has(o.id)))
  }, [])

  const deleteOrder = useCallback(async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw error
    setOrders((list) => list.filter((o) => o.id !== id))
  }, [])

  // ---------- Generic helper for reviews & testimonials ----------
  const makeCrud = (table, setter, sortKey) => ({
    save: async (values, id) => {
      const q = id ? supabase.from(table).update(values).eq('id', id) : supabase.from(table).insert(values)
      const { data, error } = await q.select().single()
      if (error) throw error
      setter((list) =>
        [...(id ? list.map((x) => (x.id === id ? data : x)) : [data, ...list])].sort((a, b) =>
          String(b[sortKey]).localeCompare(String(a[sortKey])),
        ),
      )
      return data
    },
    remove: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      setter((list) => list.filter((x) => x.id !== id))
    },
  })

  const reviewsCrud = useMemo(() => makeCrud('customer_reviews', setReviews, 'created_at'), [])
  const testimonialsCrud = useMemo(() => makeCrud('testimonials', setTestimonials, 'review_date'), [])

  const value = useMemo(
    () => ({
      orders,
      reviews,
      testimonials,
      loading,
      error,
      reload,
      saveOrder,
      setOrderStatus,
      deleteOrder,
      setStatusMany,
      deleteMany,
      saveReview: reviewsCrud.save,
      deleteReview: reviewsCrud.remove,
      saveTestimonial: testimonialsCrud.save,
      deleteTestimonial: testimonialsCrud.remove,
    }),
    [orders, reviews, testimonials, loading, error, reload, saveOrder, setOrderStatus, deleteOrder, setStatusMany, deleteMany, reviewsCrud, testimonialsCrud],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
