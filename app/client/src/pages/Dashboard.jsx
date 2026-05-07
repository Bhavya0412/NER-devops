import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import EntityHighlighter from '../components/EntityHighlighter.jsx'
import { AnimatedAIChat } from '../components/ui/animated-ai-chat'
import { BackgroundPathsLines } from '../components/ui/background-paths'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPage,
  DropdownMenuPageTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/material-ui-dropdown-menu'
import { User, History, LogOut, ScanText, Menu } from 'lucide-react'
import { api } from '../lib/api'
import AIChatPanel from '../components/AIChatPanel'
import EntityInsightCard from '../components/EntityInsightCard'
import { detectPatterns } from '../services/patternDetector'

async function downloadPdfReport({ title, inputText, entities }) {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const marginX = 40
  const maxWidth = pageWidth - marginX * 2
  const lineHeight = 16

  const safeTitle = (title || 'NER Report').toString()
  const safeText = (inputText || '').toString()
  const safeEntities = Array.isArray(entities) ? entities : []

  let y = 54
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(safeTitle, marginX, y)

  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(new Date().toLocaleString(), marginX, y)
  doc.setTextColor(0)

  y += 28
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Input', marginX, y)

  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const inputLines = doc.splitTextToSize(safeText || '(empty)', maxWidth)
  for (const line of inputLines) {
    if (y > pageHeight - 60) {
      doc.addPage()
      y = 54
    }
    doc.text(line, marginX, y)
    y += lineHeight
  }

  y += 18
  if (y > pageHeight - 60) {
    doc.addPage()
    y = 54
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Entities (${safeEntities.length})`, marginX, y)
  y += 16

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  if (safeEntities.length === 0) {
    doc.text('No entities found.', marginX, y)
    y += lineHeight
  } else {
    for (let i = 0; i < safeEntities.length; i++) {
      const e = safeEntities[i] || {}
      const label = (e.label ?? '').toString()
      const span = `${e.start ?? ''}-${e.end ?? ''}`
      const entText = (e.text ?? '').toString()
      const row = `${i + 1}. [${label}] (${span}) ${entText}`
      const rowLines = doc.splitTextToSize(row, maxWidth)

      for (const line of rowLines) {
        if (y > pageHeight - 60) {
          doc.addPage()
          y = 54
        }
        doc.text(line, marginX, y)
        y += lineHeight
      }
      y += 4
    }
  }

  doc.save('ner-report.pdf')
}

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [entities, setEntities] = useState([])
  const [analysisSummary, setAnalysisSummary] = useState('')

  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [patternAlerts, setPatternAlerts] = useState([]);

  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractStatus, setExtractStatus] = useState('')
  const pdfInputRef = useRef(null)
  const imageInputRef = useRef(null)

  const inputSectionRef = useRef(null)
  const resultsSectionRef = useRef(null)

  const entityRows = useMemo(() => {
    return (entities || []).map((e, idx) => ({ ...e, _k: `${e.start}-${e.end}-${idx}` }))
  }, [entities])

  useEffect(() => {
    if (!entities.length) return
    const count = entities.length
    setAnalysisSummary(`${count} result${count === 1 ? '' : 's'} found`)
    const timer = window.setTimeout(() => scrollTo(resultsSectionRef), 0)
    return () => window.clearTimeout(timer)
  }, [entities])

  async function analyze(overrideText) {
    const inputText = (overrideText ?? text).trim()
    if (!inputText) {
      toast.error('Paste some text first')
      return
    }

    try {
      setAnalysisSummary('Analyzing…')
      setLoading(true)
      const data = await api.analyze({ text: inputText })
      const nextEntities = data.article.entities || []
      setEntities(nextEntities)
      setPatternAlerts(detectPatterns(nextEntities))
      setShowAIPanel(true)
      setAnalysisSummary(`${nextEntities.length} result${nextEntities.length === 1 ? '' : 's'} found`)
      toast.success('Analysis complete')
    } catch (err) {
      if (err.status === 401) {
        toast.error('Session expired. Please sign in again.')
        onLogout(true)
        return
      }
      const msg = err?.message || 'Analysis failed'
      toast.error(msg)
      setAnalysisSummary(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleTextChange(nextText) {
    setText(nextText)
    setAnalysisSummary('')
  }

  async function extractTextFromImage(file) {
    const { recognize } = await import('tesseract.js')

    setExtractStatus('Scanning image…')
    try {
      const result = await recognize(file, 'hin+eng', {
        logger: (m) => {
          if (m?.progress != null) {
            const pct = Math.round(m.progress * 100)
            setExtractStatus(`${m.status || 'Scanning'} (${pct}%)`)
          } else if (m?.status) {
            setExtractStatus(m.status)
          }
        },
      })
      return result?.data?.text || ''
    } catch {
      const result = await recognize(file, 'eng', {
        logger: (m) => {
          if (m?.progress != null) {
            const pct = Math.round(m.progress * 100)
            setExtractStatus(`${m.status || 'Scanning'} (${pct}%)`)
          } else if (m?.status) {
            setExtractStatus(m.status)
          }
        },
      })
      return result?.data?.text || ''
    }
  }

  async function extractTextFromCanvas(canvas) {
    const { recognize } = await import('tesseract.js')

    setExtractStatus('Scanning PDF page…')
    try {
      const result = await recognize(canvas, 'hin+eng', {
        logger: (m) => {
          if (m?.progress != null) {
            const pct = Math.round(m.progress * 100)
            setExtractStatus(`${m.status || 'Scanning'} (${pct}%)`)
          } else if (m?.status) {
            setExtractStatus(m.status)
          }
        },
      })
      return result?.data?.text || ''
    } catch {
      const result = await recognize(canvas, 'eng', {
        logger: (m) => {
          if (m?.progress != null) {
            const pct = Math.round(m.progress * 100)
            setExtractStatus(`${m.status || 'Scanning'} (${pct}%)`)
          } else if (m?.status) {
            setExtractStatus(m.status)
          }
        },
      })
      return result?.data?.text || ''
    }
  }

  async function extractTextFromPdf(file) {
    const pdfjsLib = await import('pdfjs-dist')
    // Ensure worker is resolved in Vite.
    // eslint-disable-next-line no-underscore-dangle
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()

    setExtractStatus('Reading PDF…')
    const data = new Uint8Array(await file.arrayBuffer())
    const loadingTask = pdfjsLib.getDocument({ data })
    const pdf = await loadingTask.promise

    const maxPages = Math.min(pdf.numPages || 1, 3)
    let extracted = ''

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      setExtractStatus(`Extracting text (page ${pageNum}/${maxPages})…`)
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = (content.items || [])
        .map((it) => (typeof it?.str === 'string' ? it.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (pageText) extracted += `${pageText}\n\n`
    }

    if (extracted.trim().length >= 30) return extracted

    // Fallback for scanned PDFs: OCR the first page.
    setExtractStatus('No embedded text found — scanning first page…')
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    return await extractTextFromCanvas(canvas)
  }

  async function handleUpload(file) {
    if (!file) return
    if (loading || extracting) return

    try {
      setExtracting(true)
      setExtractStatus('Starting…')

      let extracted = ''
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        extracted = await extractTextFromPdf(file)
      } else if (file.type.startsWith('image/')) {
        extracted = await extractTextFromImage(file)
      } else {
        toast.error('Unsupported file type')
        return
      }

      extracted = (extracted || '').trim()
      if (!extracted) {
        toast.error('No text detected')
        return
      }

      setText(extracted)
      toast.success('Text extracted')
      await analyze(extracted)
    } catch (err) {
      toast.error(err?.message || 'Failed to extract text')
    } finally {
      setExtractStatus('')
      setExtracting(false)
    }
  }

  async function exportPdf() {
    if (!text.trim()) {
      toast.error('Paste some text first')
      return
    }
    try {
      await downloadPdfReport({
        title: 'NER Studio — Report',
        inputText: text,
        entities,
      })
      toast.success('Downloaded PDF')
    } catch (err) {
      toast.error(err?.message || 'Failed to export PDF')
    }
  }

  function scrollTo(ref) {
    const node = ref?.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50 dark:bg-black">
      <div className="dark">
        <BackgroundPathsLines className="opacity-50" />
      </div>

      <div className="absolute top-6 left-6 z-30">
        <DropdownMenu>
          <DropdownMenuTrigger className="px-4 py-2 rounded-xl shadow-sm text-sm font-semibold transition-all active:scale-[0.98] text-slate-900 dark:text-slate-100 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/15 backdrop-blur">
            <span className="flex items-center gap-2">
              <Menu className="h-4 w-4 opacity-80" />
              Menu
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-[16rem] bg-white/90 dark:bg-black/60 text-slate-900 dark:text-slate-100 border-black/10 dark:border-white/15">
            <DropdownMenuPage id="main">
              <DropdownMenuLabel className="text-slate-200/80">Dashboard</DropdownMenuLabel>

              <DropdownMenuPageTrigger targetId="profile" className="text-slate-900 dark:text-slate-100">
                <User className="w-4 h-4 text-slate-300" />
                <span>Profile</span>
              </DropdownMenuPageTrigger>

              <DropdownMenuItem
                className="text-slate-900 dark:text-slate-100"
                onSelect={(e) => {
                  e.preventDefault()
                  scrollTo(inputSectionRef)
                }}
              >
                <ScanText className="w-4 h-4 text-slate-300" />
                <span>NER</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-slate-900 dark:text-slate-100"
                onSelect={(e) => {
                  e.preventDefault()
                  navigate('/history')
                }}
              >
                <History className="w-4 h-4 text-slate-300" />
                <span>Search History</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-slate-900 dark:text-slate-100 focus:bg-black/5 dark:focus:bg-white/10"
                onSelect={(e) => {
                  e.preventDefault()
                  onLogout(false)
                }}
              >
                <LogOut className="w-4 h-4 text-slate-300" />
                <span>Signout</span>
              </DropdownMenuItem>
            </DropdownMenuPage>

            <DropdownMenuPage id="profile">
              <DropdownMenuLabel className="text-slate-200/80">Profile</DropdownMenuLabel>
              <div className="px-5 pb-4">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name || 'User'}
                </div>
                <div className="mt-1 text-xs text-slate-300 break-all">
                  {user?.email || ''}
                </div>
              </div>
            </DropdownMenuPage>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div ref={inputSectionRef} />
          <AnimatedAIChat
            value={text}
            onChange={handleTextChange}
            onAnalyze={analyze}
            isLoading={loading}
            header="NER Studio"
            placeholder="Paste your article here…"
            status={extracting ? extractStatus || 'Scanning…' : analysisSummary}
            toolbar={
              <>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    handleUpload(f)
                  }}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    handleUpload(f)
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={loading || extracting}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  Upload PDF
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={loading || extracting}
                  onClick={() => imageInputRef.current?.click()}
                >
                  Upload Image
                </button>
              </>
            }
          >
          <motion.div
            ref={resultsSectionRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Results</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Highlights + entity table.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {entities.length > 0 && (
                  <button className="btn-ghost" style={{background: '#534AB7', color: 'white', border: 'none'}} type="button" onClick={() => setShowAIPanel(true)}>Local Insights ✦</button>
                )}
                <button className="btn-ghost" type="button" onClick={exportPdf} disabled={loading || extracting}>
                  Export PDF
                </button>
                <button className="btn-ghost" type="button" onClick={() => setText('')}>Clear</button>
              </div>
            </div>

            {patternAlerts.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {patternAlerts.map((alert, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '8px',
                    background: alert.type === 'danger' ? '#2a1010' : alert.type === 'warning' ? '#1e1a0a' : '#0a1020',
                    border: `1px solid ${alert.type === 'danger' ? '#5a2020' : alert.type === 'warning' ? '#4a3a10' : '#1a3060'}`,
                    color: alert.type === 'danger' ? '#f09595' : alert.type === 'warning' ? '#FAC775' : '#85B7EB',
                    fontSize: '12px' }}>
                    {alert.message}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/20 p-4 max-h-[260px] overflow-auto scrollbar">
              <EntityHighlighter text={text} entities={entities} onEntityClick={(e, ev) => { setSelectedEntity(e); setCardPosition({ x: ev.clientX, y: ev.clientY }); }} />
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-12 bg-black/5 dark:bg-white/5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="col-span-6">Entity</div>
                <div className="col-span-3">Type</div>
                <div className="col-span-3">Position</div>
              </div>
              <div className="max-h-[260px] overflow-auto scrollbar">
                {entityRows.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-slate-400">No entities yet.</div>
                ) : (
                  entityRows.map((e) => (
                    <div key={e._k} className="grid grid-cols-12 px-3 py-2 text-sm border-t border-black/5 dark:border-white/5">
                      <div className="col-span-6 truncate">{e.text}</div>
                      <div className="col-span-3 text-slate-600 dark:text-slate-300">{e.label}</div>
                      <div className="col-span-3 text-slate-500 dark:text-slate-400">{e.start}-{e.end}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </AnimatedAIChat>
        </div>
      </div>
      <AIChatPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} entities={entities} documentText={text} />
      {selectedEntity && <EntityInsightCard entity={selectedEntity} allEntities={entities} documentText={text} onClose={() => setSelectedEntity(null)} position={cardPosition} />}
    </div>
  )
}
