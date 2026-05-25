import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSignalR } from '../hooks/useSignalR'
import { leaveRoom } from '../services/api'

export default function LobbyPage() {
  const { roomCode, playerId, playerName, isHost, phase, players } = useGameStore()
  const { invoke } = useSignalR()
  const navigate = useNavigate()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  // Stable stars — in useState so positions don't regenerate on re-render
  const [stars] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 3,
    }))
  )

  useEffect(() => {
    if (phase === 'Night') navigate('/night')
  }, [phase, navigate])

  const livingCount = players.length
  const canStart = isHost && livingCount >= 4

  const handleStart = () => {
    invoke('StartGame', roomCode)
  }

  const handleLeave = async () => {
    try {
      await leaveRoom(roomCode, playerId)
    } catch (e) {
      console.error('[LeaveRoom] REST call failed', e)
    }
    useGameStore.getState().fullReset()        // clears roomCode → App.tsx stops redirecting
    localStorage.removeItem('mafia-game')     // clear persisted state
    navigate('/', { replace: true })
  }

  return (
    <>
    <div className="relative min-h-screen bg-night-bg flex flex-col items-center justify-center p-4">
      {/* Stars bg */}
      <div className="stars-container opacity-40">
        {stars.map(s => (
          <span key={s.id} className="star" style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--duration': `${s.duration}s`,
            '--delay': `${s.delay}s`,
          } as React.CSSProperties} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Leave room */}
        <div className="mb-4 text-left px-1">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="text-slate-500 hover:text-red-400 text-sm flex items-center gap-1.5 transition-colors"
          >
            ← Leave Room
          </button>
        </div>

        {/* Room Code display */}
        <div className="text-center mb-8">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Room Code</p>
          <div className="inline-block bg-night-card border-2 border-mafia-red rounded-2xl px-8 py-4 glow-red">
            <span className="text-4xl font-mono font-bold text-white tracking-[0.3em]">{roomCode}</span>
          </div>
          <p className="text-slate-500 text-xs mt-2">Share this code with friends</p>
        </div>

        {/* Player List */}
        <div className="bg-night-card border border-night-border rounded-2xl p-5 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              👥 Players
            </h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${livingCount >= 4 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
              {livingCount} / 20 {livingCount < 4 ? `(need ${4 - livingCount} more)` : '✓ Ready'}
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {players.map(p => (
              <div
                key={p.playerId}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                  p.playerId === playerId
                    ? 'bg-mafia-darkred/30 border border-mafia-red/40'
                    : 'bg-night-bg border border-night-border'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  p.isHost ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'
                }`}>
                  {p.isHost ? '👑' : p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium text-sm flex-1">{p.name}</span>
                {p.playerId === playerId && (
                  <span className="text-xs text-slate-400 font-mono">(you)</span>
                )}
                {p.isHost && (
                  <span className="text-xs text-amber-400 font-semibold">Host</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Role count preview */}
        {livingCount >= 4 && (
          <div className="bg-night-surface border border-night-border rounded-xl px-4 py-3 mb-6 text-xs text-slate-400 text-center">
            {(() => {
              const n = livingCount
              const mafia = Math.max(1, Math.floor(n / 4))
              const citizens = n - mafia - 1 - 1
              return `🔴 ${mafia} Mafia · 🟢 1 Doctor · 🔵 1 Detective · ⚪ ${citizens} Citizens`
            })()}
          </div>
        )}

        {/* Start Button (host only) */}
        {isHost ? (
          <button
            id="startGameBtn"
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full font-bold py-4 rounded-xl transition-all duration-200 text-lg shadow-lg ${
              canStart
                ? 'bg-gradient-to-r from-mafia-darkred to-mafia-red hover:from-mafia-red hover:to-mafia-glow text-white glow-red hover:scale-[1.02]'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {canStart ? '🎭 Start Game' : `⏳ Waiting for ${Math.max(0, 4 - livingCount)} more players...`}
          </button>
        ) : (
          <div className="text-center text-slate-500 text-sm py-3">
            ⏳ Waiting for host to start the game...
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-4">
          Minimum 4 players · Maximum 20 players
        </p>
      </div>
    </div>

    {/* Leave Room Confirmation Dialog */}
    {showLeaveConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-night-card border border-night-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-float-up">
          <div className="text-5xl mb-4">🚪</div>
          <h2 className="text-xl font-display text-white mb-2">Leave Room?</h2>
          <p className="text-slate-400 text-sm mb-6">
            {isHost
              ? 'You are the host. Leaving may disrupt the game for other players.'
              : 'You will be removed from the room and cannot rejoin.'}
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
    </>
  )
}
