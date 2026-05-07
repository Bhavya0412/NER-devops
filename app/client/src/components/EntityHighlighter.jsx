const COLOR = {
  PERSON: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  ORG: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
  LOC: 'bg-rose-500/20 text-rose-200 border-rose-400/30'
}

function normalizeEntities(entities) {
  return [...(entities || [])]
    .filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > e.start)
    .sort((a, b) => (a.start - b.start) || (a.end - b.end))
}

export default function EntityHighlighter({ text, entities, onEntityClick }) {
  if (!text) return <div className="text-sm text-slate-400">Paste text and run analysis.</div>

  const ents = normalizeEntities(entities)
  const parts = []
  let cursor = 0

  for (let i = 0; i < ents.length; i++) {
    const e = ents[i]
    if (e.start < cursor) continue

    if (e.start > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, e.start), key: `t-${cursor}` })
    }

    parts.push({
      type: 'entity',
      key: `e-${e.start}-${e.end}-${i}`,
      value: text.slice(e.start, e.end),
      label: e.label,
      entity: e
    })

    cursor = e.end
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor), key: `t-${cursor}` })
  }

  return (
    <div className="leading-relaxed whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">
      {parts.map((p) => {
        if (p.type === 'text') return <span key={p.key}>{p.value}</span>

        const klass = COLOR[p.label] || 'bg-white/10 text-slate-100 border-white/10 hover:bg-white/20 transition-colors'
        return (
          <span
            key={p.key}
            onClick={(e) => onEntityClick && onEntityClick(p.entity, e)}
            className={`mx-[1px] inline-flex items-center gap-2 rounded-md border px-1.5 py-0.5 cursor-pointer ${klass}`}
            title={p.label}
          >
            <span>{p.value}</span>
            <span className="text-[10px] opacity-80">{p.label}</span>
          </span>
        )
      })}
    </div>
  )
}

