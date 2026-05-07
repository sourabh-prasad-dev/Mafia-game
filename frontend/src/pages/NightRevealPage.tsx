import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

export default function NightRevealPage() {
  const { nightResult, phase } = useGameStore()
  const navigate = useNavigate()

  // Auto-advance handled by server PhaseChanged event
  useEffect(() => {
    if (phase === 'Day' || phase === 'DayVote') navigate('/day')
    if (phase === 'GameOver') navigate('/gameover')
  }, [phase, navigate])

  const killed = nightResult?.killedPlayer
  const wasProtected = nightResult?.wasProtected

  return (
    <div className="relative min-h-screen bg-night-bg flex flex-col items-center justify-center overflow-hidden">
      {/* Dark vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 pointer-events-none" />

      {/* Stars dimmed */}
      <div className="stars-container opacity-30">
        {Array.from({ length: 60 }, (_, i) => (
          <span key={i} className="star" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
            '--duration': `${Math.random() * 3 + 2}s`, '--delay': `${Math.random() * 3}s`,
          } as React.CSSProperties} />
        ))}
      </div>

      <div className="relative z-10 text-center px-6 animate-float-up max-w-md w-full mx-auto">
        {/* Dawn breaks icon */}
        <div className="text-6xl mb-8 animate-pulse">🌅</div>

        <h2 className="text-slate-400 text-xs uppercase tracking-[0.3em] mb-4">Dawn breaks...</h2>

        {wasProtected ? (
          <div className="space-y-4">
            <div className="bg-green-900/40 border border-green-700/50 rounded-3xl p-8">
              <div className="text-5xl mb-4">🛡️</div>
              <h1 className="text-3xl font-display text-green-300 mb-3">
                The town was peaceful.
              </h1>
              <p className="text-green-400/70">
                The doctor's protection saved someone from the night.
              </p>
              <p className="text-white/60 text-sm mt-2">Nobody died.</p>
            </div>
          </div>
        ) : killed ? (
          <div className="space-y-4">
            <div className="bg-red-950/60 border border-red-700/40 rounded-3xl p-8 glow-red">
              <div className="text-5xl mb-4">💀</div>
              <h1 className="text-3xl font-display text-red-200 mb-3 leading-tight">
                {killed.name} was found<br />dead this morning.
              </h1>
              <p className="text-red-400/60 text-sm mt-2">
                Their role will be revealed when the game ends.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-600/40 rounded-3xl p-8">
            <div className="text-5xl mb-4">🌄</div>
            <h1 className="text-3xl font-display text-slate-200 mb-3">
              Nobody died last night.
            </h1>
            <p className="text-slate-400">The town breathes a sigh of relief.</p>
          </div>
        )}

        <p className="text-slate-600 text-xs mt-8 animate-pulse">Day begins shortly...</p>
      </div>
    </div>
  )
}
