import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

import { api } from '../lib/api'
import Spinner from '../components/Spinner.jsx'

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function Login({ onAuth }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => validateEmail(email) && password.length >= 8 && !loading, [email, password, loading])

  async function submit(e) {
    e.preventDefault()
    if (!canSubmit) return

    try {
      setLoading(true)
      const data = await api.login({ email: email.trim().toLowerCase(), password })
      onAuth(data.user)
      toast.success('Welcome back')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/15 dark:bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/15 dark:bg-fuchsia-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-md px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8"
          >
            <div className="mb-6">
              <div className="text-2xl font-semibold">Sign in</div>
              <div className="text-sm text-slate-300">Access your NER dashboard</div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <div className="label mb-2">Email</div>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>

              <div>
                <div className="label mb-2">Password</div>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
              </div>

              <motion.button whileTap={{ scale: 0.99 }} className="btn-primary w-full" disabled={!canSubmit} type="submit">
                {loading ? <Spinner label="Signing in" /> : 'Login'}
              </motion.button>
            </form>

            <div className="mt-6 text-sm text-slate-300">
              New here?{' '}
              <Link className="text-slate-100 underline decoration-white/30 hover:decoration-white" to="/signup">
                Create an account
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
