import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { ConfirmProvider, FullLoader } from '@/components/ui'
import { supabaseConfigured } from '@/lib/supabase'
import { useIsDark } from '@/components/charts'
import Layout from '@/components/Layout'
import { Login, Register, ForgotPassword, ResetPassword } from '@/pages/Auth'
import SetupMissing from '@/pages/SetupMissing'

const Beranda = lazy(() => import('@/pages/Beranda'))
const PurchaseOrder = lazy(() => import('@/pages/PurchaseOrder'))
const Performa = lazy(() => import('@/pages/Performa'))
const Ulasan = lazy(() => import('@/pages/Ulasan'))
const Riwayat = lazy(() => import('@/pages/Riwayat'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const DataAnalyst = lazy(() => import('@/pages/DataAnalyst'))
const Pengaturan = lazy(() => import('@/pages/settings/Pengaturan'))

function Protected() {
  const { session, loading } = useAuth()
  if (loading) return <FullLoader />
  if (!session) return <Navigate to="/masuk" replace />
  return (
    <DataProvider>
      <Layout />
    </DataProvider>
  )
}

function GuestOnly({ children }) {
  const { session, loading, recovery } = useAuth()
  if (loading) return <FullLoader />
  if (session && !recovery) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<FullLoader />}>
      <Routes>
        <Route path="/masuk" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/daftar" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/lupa-sandi" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
        <Route path="/reset-sandi" element={<ResetPassword />} />
        <Route element={<Protected />}>
          <Route index element={<Beranda />} />
          <Route path="purchase-order" element={<PurchaseOrder />} />
          <Route path="performa" element={<Performa />} />
          <Route path="ulasan" element={<Ulasan />} />
          <Route path="riwayat" element={<Riwayat />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="data-analyst" element={<DataAnalyst />} />
          <Route path="pengaturan/*" element={<Pengaturan />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  const dark = useIsDark()
  if (!supabaseConfigured) return <SetupMissing />
  return (
    <AuthProvider>
      <ConfirmProvider>
        <AppRoutes />
        <Toaster richColors position="top-center" theme={dark ? 'dark' : 'light'} closeButton />
      </ConfirmProvider>
    </AuthProvider>
  )
}
