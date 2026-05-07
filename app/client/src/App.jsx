import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import Login from './pages/Login.tsx'
import Signup from './pages/Signup.tsx'
import CreateAccount from './pages/CreateAccount.tsx'
import Dashboard from './pages/Dashboard.jsx'
import HistoryPage from './pages/History.jsx'
import { DemoOne } from './pages/demo'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { api } from './lib/api'

export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    async function boot() {
      try {
        const data = await api.me()
        if (data?.user) {
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        }
      } catch {
        localStorage.removeItem('user')
        setUser(null)
      } finally {
        setBooting(false)
      }
    }

    boot()
  }, [])

  async function logout(silent) {
    try {
      await api.logout()
    } catch {
      // ignore
    }

    localStorage.removeItem('user')
    setUser(null)
    if (!silent) toast.success('Logged out')
    navigate('/login')
  }

  function onAuth(nextUser) {
    setUser(nextUser)
    localStorage.setItem('user', JSON.stringify(nextUser))
  }

  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-200">
        <div className="glass rounded-2xl px-6 py-4">Booting…</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onAuth={onAuth} />} />
      <Route path="/demo" element={<DemoOne />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup onAuth={onAuth} />} />
      <Route
        path="/create-account"
        element={user ? <Navigate to="/" replace /> : <CreateAccount onAuth={onAuth} />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute user={user}>
            <Dashboard user={user} onLogout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute user={user}>
            <HistoryPage user={user} onLogout={logout} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}
