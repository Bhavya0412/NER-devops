export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 dark:border-white/20 border-t-black/70 dark:border-t-white/80" />
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  )
}
