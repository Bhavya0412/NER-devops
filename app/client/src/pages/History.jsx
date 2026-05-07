import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import Spinner from '../components/Spinner.jsx'
import EntityHighlighter from '../components/EntityHighlighter.jsx'
import { BackgroundPathsLines } from '../components/ui/background-paths'
import { api } from '../lib/api'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return ''
  }
}

export default function HistoryPage({ user, onLogout }) {
  const navigate = useNavigate()
  const [historyLoading, setHistoryLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const debounceRef = useRef(null)

  async function refreshHistory(q = '') {
    try {
      setHistoryLoading(true)
      const data = await api.history(q)
      setHistory(data.items || [])
    } catch (err) {
      if (err.status === 401) {
        onLogout(true)
        return
      }
      toast.error(err.message || 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    refreshHistory('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => refreshHistory(query), 250)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const top10 = useMemo(() => {
    const items = Array.isArray(history) ? [...history] : []
    items.sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    return items.slice(0, 10)
  }, [history])

  async function deleteItem(id) {
    try {
      await api.deleteHistory(id)
      toast.success('Deleted')
      if (selected?._id === id) setSelected(null)
      await refreshHistory(query)
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  function viewItem(item) {
    setSelected(item)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <div className="dark">
        <BackgroundPathsLines className="opacity-50" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-semibold text-slate-100">📚 History</div>
            <div className="text-sm text-slate-300">Search and delete past analyses.</div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] text-slate-100 bg-white/10 border border-white/20 hover:bg-white/15 backdrop-blur"
              type="button"
              onClick={() => navigate('/')}
            >
              Back
            </button>
            <div className="text-xs text-slate-400">
              {user?.email ? `Signed in as ${user.email}` : ''}
            </div>
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-5">
          <div className="w-full sm:w-96">
            <div className="label mb-2">Search</div>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in history…"
            />
          </div>

          <div className="mt-4">
            {historyLoading ? (
              <Spinner label="Loading history" />
            ) : top10.length === 0 ? (
              <div className="text-sm text-slate-400">No history yet. Run your first analysis.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {top10.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-300">{formatDate(item.createdAt)}</div>
                        <div className="mt-2 max-h-24 overflow-hidden text-sm text-slate-100 whitespace-pre-wrap break-words">
                          {item.text?.slice(0, 220)}
                          {item.text && item.text.length > 220 ? '…' : ''}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="btn-ghost" type="button" onClick={() => viewItem(item)}>
                          View
                        </button>
                        <button className="btn-ghost" type="button" onClick={() => deleteItem(item._id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">Entities: {item.entities?.length || 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/5 dark:bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-100">Analyzed Output</div>
                  <div className="text-xs text-slate-300">{formatDate(selected.createdAt)}</div>
                </div>
                <button className="btn-ghost" type="button" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4 max-h-[260px] overflow-auto scrollbar">
                <EntityHighlighter text={selected.text || ''} entities={Array.isArray(selected.entities) ? selected.entities : []} />
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  <div className="col-span-6">Entity</div>
                  <div className="col-span-3">Type</div>
                  <div className="col-span-3">Position</div>
                </div>
                <div className="max-h-[260px] overflow-auto scrollbar">
                  {(selected.entities || []).length === 0 ? (
                    <div className="px-3 py-6 text-sm text-slate-400">No entities.</div>
                  ) : (
                    (selected.entities || []).map((e, idx) => (
                      <div
                        key={`${e.start}-${e.end}-${idx}`}
                        className="grid grid-cols-12 px-3 py-2 text-sm border-t border-white/10"
                      >
                        <div className="col-span-6 truncate text-slate-100">{e.text}</div>
                        <div className="col-span-3 text-slate-300">{e.label}</div>
                        <div className="col-span-3 text-slate-400">{e.start}-{e.end}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
