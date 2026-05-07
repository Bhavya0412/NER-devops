import { motion } from 'framer-motion'
import ThemeToggle from './ThemeToggle.jsx'

export default function Navbar({ user, onLogout }) {
  return (
    <div className="sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center border border-white/10">
              <span className="text-sm font-semibold">NS</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">NER Studio</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Portfolio-grade entity extraction</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-600 dark:text-slate-300">Signed in as</div>
              <div className="text-sm">{user?.email}</div>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
              className="btn-primary"
              onClick={onLogout}
              type="button"
            >
              Logout
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
