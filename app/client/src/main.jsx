import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import App from './App.jsx'
import './styles.css'

// Ensure the app runs in dark mode by default.
// (Previously this was only applied when ThemeToggle was mounted.)
try {
  const saved = localStorage.getItem('theme')
  const theme = saved || 'dark'
  if (!saved) localStorage.setItem('theme', theme)
  document.documentElement.classList.toggle('dark', theme === 'dark')
} catch {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.75)',
            color: '#e2e8f0',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            backdropFilter: 'blur(10px)'
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
