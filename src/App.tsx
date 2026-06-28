import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'

const Home = lazy(() => import('./pages/Home'))
const Chores = lazy(() => import('./pages/Chores'))
const History = lazy(() => import('./pages/History'))
const Stats = lazy(() => import('./pages/Stats'))
const Settings = lazy(() => import('./pages/Settings'))

function Gate() {
  const { session, loading } = useAuth()

  if (loading) {
    return <p className="text-slate-400 mt-20 text-center">로딩 중...</p>
  }

  if (!session) {
    return <Login />
  }

  return (
    <Suspense fallback={<p className="text-slate-400 mt-20 text-center">불러오는 중...</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="chores" element={<Chores />} />
          <Route path="history" element={<History />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
