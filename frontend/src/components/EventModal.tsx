import { useEffect } from 'react'
import { useGameStore, GameEvent } from '../store/gameStore'

export default function EventModal() {
  const activeEvent = useGameStore((s) => s.activeEvent)
  const clearEvent = useGameStore((s) => s.clearEvent)

  useEffect(() => {
    if (!activeEvent) return
    const timer = setTimeout(clearEvent, 4500)
    return () => clearTimeout(timer)
  }, [activeEvent?.id]) // re-run only when a new event is queued

  if (!activeEvent) return null

  const styles: Record<GameEvent['accent'], { border: string; bg: string; titleColor: string }> = {
    red:     { border: 'border-red-700/60',    bg: 'bg-red-950/95',    titleColor: 'text-red-200' },
    gold:    { border: 'border-amber-500/60',  bg: 'bg-amber-950/95',  titleColor: 'text-amber-200' },
    blue:    { border: 'border-blue-700/60',   bg: 'bg-blue-950/95',   titleColor: 'text-blue-200' },
    green:   { border: 'border-green-700/60',  bg: 'bg-green-950/95',  titleColor: 'text-green-200' },
    default: { border: 'border-slate-600/60',  bg: 'bg-slate-900/95',  titleColor: 'text-white' },
  }

  const { border, bg, titleColor } = styles[activeEvent.accent]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-fade-in"
      onClick={clearEvent}
    >
      <div
        className={`relative max-w-sm w-full mx-4 rounded-3xl border-2 ${border} ${bg} p-8 text-center shadow-2xl animate-float-up`}
        onClick={(e) => e.stopPropagation()} // prevent dismissal when clicking the card itself
      >
        {/* Close button */}
        <button
          onClick={clearEvent}
          className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl transition-colors"
        >
          ✕
        </button>

        <div className="text-7xl mb-4 leading-none">{activeEvent.icon}</div>
        <h2 className={`text-2xl font-display mb-3 ${titleColor}`}>{activeEvent.title}</h2>
        <p className="text-slate-300 text-sm leading-relaxed">{activeEvent.message}</p>

        {/* Auto-dismiss progress bar */}
        <div className="mt-6 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-500 rounded-full"
            style={{ animation: 'grow 4.5s linear forwards' }}
          />
        </div>
        <p className="text-slate-600 text-xs mt-2">Tap anywhere to dismiss</p>
      </div>

      <style>{`
        @keyframes grow {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  )
}
