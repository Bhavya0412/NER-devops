import { useEffect, useState } from 'react'

function applyTheme(mode) {
  const root = document.documentElement
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export default function ThemeToggle() {
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    applyTheme(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', mode)
    applyTheme(mode)
  }, [mode])

  return (
    <button
      className="btn-ghost"
      onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {mode === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
