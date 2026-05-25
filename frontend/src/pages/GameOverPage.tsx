import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSignalR } from '../hooks/useSignalR'
import { leaveRoom } from '../services/api'

export default function GameOverPage() {
  const { winningFaction, allPlayersReveal, roomCode, isHost, playerId } = useGameStore()
  const { invoke } = useSignalR()
  const navigate = useNavigate()

  const mafia = allPlayersReveal.filter(p => p.role === 'Mafia')
  const town = allPlayersReveal.filter(p => p.role !== 'Mafia')
  const mafiaWon = winningFaction === 'Mafia'

  // Stable stars
  const [stars] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2 + 1, duration: Math.random() * 3 + 2, delay: Math.random() * 3,
    }))
  )

  const handlePlayAgain = () => {
    invoke('PlayAgain', roomCode)
  }

  const handleGoHome = async () => {
    try {
      await leaveRoom(roomCode, playerId)
    } catch (e) {
      console.error('[LeaveRoom] REST call failed', e)
    }
    useGameStore.getState().fullReset()
    localStorage.removeItem('mafia-game')
    navigate('/', { replace: true })
  }

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-10 pb-10 px-4 ${
      mafiaWon ? 'bg-gradient-to-b from-red-950 via-night-bg to-night-bg' : 'bg-gradient-to-b from-amber-50 via-amber-100 to-day-bg'
    }`}>
      {/* Background stars (mafia) or sun (town) */}
      {mafiaWon ? (
        <div className="stars-container opacity-40">
          {stars.map(s => (
            <span key={s.id} className="star" style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              '--duration': `${s.duration}s`, '--delay': `${s.delay}s`,
            } as React.CSSProperties} />
          ))}
        </div>
      ) : (
        <div className="absolute top-6 right-8 text-6xl">☀️</div>
      )}

      <div className="relative z-10 w-full max-w-lg animate-float-up">
        {/* Winner banner */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">
            {mafiaWon ? '🔴' : '🏆'}
          </div>
          <h1 className={`text-4xl font-display mb-2 ${mafiaWon ? 'text-red-200' : 'text-amber-900'}`}>
            {mafiaWon ? 'Mafia Wins!' : 'Town Wins!'}
          </h1>
          <p className={`text-sm ${mafiaWon ? 'text-red-400' : 'text-amber-700'}`}>
            {mafiaWon ? 'The shadows have consumed the village.' : 'Justice has been served. The Mafia is no more.'}
          </p>
        </div>

        {/* Full role reveal */}
        <div className={`rounded-2xl border p-5 mb-6 shadow-xl ${
          mafiaWon ? 'bg-red-950/60 border-red-800/40' : 'bg-white/80 border-amber-200'
        }`}>
          <h2 className={`text-xs uppercase tracking-widest font-bold mb-4 ${mafiaWon ? 'text-red-400' : 'text-amber-700'}`}>
            🎭 Full Role Reveal
          </h2>

          <div className="space-y-2">
            {allPlayersReveal.map(p => (
              <div
                key={p.playerId}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  mafiaWon
                    ? 'bg-red-900/30 border border-red-800/20'
                    : 'bg-amber-50 border border-amber-100'
                } ${!p.isAlive ? 'opacity-50' : ''}`}
              >
                <span className="text-lg">
                  {p.role === 'Mafia' ? '🔴' : p.role === 'Doctor' ? '🟢' : p.role === 'Detective' ? '🔵' : '⚪'}
                </span>
                <span className={`font-semibold text-sm flex-1 ${mafiaWon ? 'text-white' : 'text-amber-900'}`}>
                  {p.name}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  p.role === 'Mafia' ? 'bg-red-800 text-red-200' :
                  p.role === 'Doctor' ? 'bg-green-800 text-green-200' :
                  p.role === 'Detective' ? 'bg-blue-800 text-blue-200' :
                  'bg-slate-600 text-slate-200'
                }`}>
                  {p.role}
                </span>
                {!p.isAlive && <span className="text-slate-500 text-xs">💀</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {isHost ? (
            <button
              id="playAgainBtn"
              onClick={handlePlayAgain}
              className={`w-full font-bold py-4 rounded-xl text-lg transition-all duration-200 shadow-lg hover:scale-[1.02] ${
                mafiaWon
                  ? 'bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white glow-red'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-900 glow-gold'
              }`}
            >
              🔄 Play Again
            </button>
          ) : (
            <div className={`text-center text-sm py-3 ${mafiaWon ? 'text-red-400' : 'text-amber-600'}`}>
              ⏳ Waiting for host to start a new game...
            </div>
          )}

          {/* Leave / Home button — always visible */}
          <button
            onClick={handleGoHome}
            className={`w-full py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
              mafiaWon
                ? 'border-red-800/40 text-red-400 hover:bg-red-950/40'
                : 'border-amber-300 text-amber-700 hover:bg-amber-50'
            }`}
          >
            🏠 Leave Game
          </button>
        </div>
      </div>
    </div>
  )
}
