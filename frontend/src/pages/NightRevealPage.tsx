import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { leaveRoom } from '../services/api'

export default function NightRevealPage() {
  const { nightResult, phase, isHost, roomCode, playerId } = useGameStore()
  const navigate = useNavigate()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const handleLeave = async () => {
    try {
      await leaveRoom(roomCode, playerId)
    } catch (e) {
      console.error('[LeaveRoom] REST call failed', e)
    }
    useGameStore.getState().fullReset()
    localStorage.removeItem('mafia-game')
    navigate('/', { replace: true })
  }

  // Stable stars
  const [stars] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2 + 1, duration: Math.random() * 3 + 2, delay: Math.random() * 3,
    }))
  )

  // Auto-advance handled by server PhaseChanged event
  useEffect(() => {
    if (phase === 'Day' || phase === 'DayVote') navigate('/day')
    if (phase === 'GameOver') navigate('/gameover')
  }, [phase, navigate])

  const killed = nightResult?.killedPlayer
  const wasProtected = nightResult?.wasProtected

  return (
    <div className="relative min-h-screen bg-night-bg flex flex-col items-center justify-center overflow-hidden">
      {/* Leave button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="text-slate-500 hover:text-red-400 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Leave Game
        </button>
      </div>

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 pointer-events-none" />

      {/* Stars dimmed */}
      <div className="stars-container opacity-30">
        {stars.map(s => (
          <span key={s.id} className="star" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: `${s.size}px`, height: `${s.size}px`,
            '--duration': `${s.duration}s`, '--delay': `${s.delay}s`,
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

      {/* Leave Room Confirmation Dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-night-card border border-night-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-float-up">
            <div className="text-5xl mb-4">🚪</div>
            <h2 className="text-xl font-display text-white mb-2">Leave Game?</h2>
            <p className="text-slate-400 text-sm mb-6">
              {isHost
                ? 'You are the host. Leaving may disrupt the game for other players.'
                : 'You will leave the game and return to the main lobby.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-night-border text-slate-300 hover:bg-night-surface transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white transition-colors text-sm font-semibold"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
