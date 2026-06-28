import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSignalR } from '../hooks/useSignalR'
import { leaveRoom } from '../services/api'
import CountdownTimer from '../components/CountdownTimer'
import MafiaActionPanel from '../components/ActionPanel/MafiaActionPanel'
import DoctorActionPanel from '../components/ActionPanel/DoctorActionPanel'
import DetectiveActionPanel from '../components/ActionPanel/DetectiveActionPanel'
import CitizenActionPanel from '../components/ActionPanel/CitizenActionPanel'
import PlayerList from '../components/PlayerList'

export default function NightPage() {
  const { role, phase, players, playerId, round, mafiaTeammates, mafiaVotes, roomCode, hasSubmittedNightAction, isHost } = useGameStore()
  const { invoke } = useSignalR()
  const navigate = useNavigate()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [stars] = useState(() =>
    Array.from({ length: 120 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5, duration: Math.random() * 4 + 2, delay: Math.random() * 4,
    }))
  )

  useEffect(() => {
    if (phase === 'NightReveal') navigate('/night-reveal')
    if (phase === 'Day' || phase === 'DayVote') navigate('/day')
    if (phase === 'GameOver') navigate('/gameover')
  }, [phase, navigate])

  const me = players.find(p => p.playerId === playerId)
  const isAlive = me?.isAlive ?? true
  const alivePlayers = players.filter(p => p.isAlive)

  const handleSubmitAction = (actionType: string, targetPlayerId?: string) => {
    invoke('SubmitNightAction', roomCode, actionType, targetPlayerId ?? null)
    useGameStore.getState().setNightActionSubmitted()
  }

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

  const mafiaTeammateIds = new Set(mafiaTeammates.map(m => m.playerId))

  return (
    <div className="relative min-h-screen bg-night-bg overflow-hidden flex flex-col p-4">
      {/* Stars */}
      <div className="stars-container">
        {stars.map(s => (
          <span key={s.id} className="star" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: `${s.size}px`, height: `${s.size}px`,
            '--duration': `${s.duration}s`, '--delay': `${s.delay}s`,
          } as React.CSSProperties} />
        ))}
      </div>

      {/* Moon */}
      <div className="absolute top-6 right-8 text-5xl opacity-80 animate-pulse">🌙</div>

      {/* Leave Game */}
      <div className="relative z-20 text-left mb-2 self-start px-4">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="text-slate-500 hover:text-red-400 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Leave Game
        </button>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center pt-8 pb-4 px-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Round {round}</p>
        <h1 className="text-3xl font-display text-white">Night Falls</h1>
        <p className="text-slate-400 text-sm mt-1">The village sleeps... but not everyone.</p>
      </div>

      {/* Timer */}
      <div className="relative z-10 flex justify-center py-2">
        <CountdownTimer />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4 space-y-4 max-w-xl mx-auto w-full">
        {/* Role banner */}
        <div className={`rounded-2xl border px-4 py-3 text-center font-semibold text-sm ${
          role === 'Mafia' ? 'bg-red-950/60 border-red-700/50 text-red-300' :
          role === 'Doctor' ? 'bg-green-950/60 border-green-700/50 text-green-300' :
          role === 'Detective' ? 'bg-blue-950/60 border-blue-700/50 text-blue-300' :
          'bg-slate-800/60 border-slate-600/50 text-slate-300'
        }`}>
          {role === 'Mafia' && '🔴 You are Mafia — choose a target to eliminate'}
          {role === 'Doctor' && '🟢 You are the Doctor — protect someone tonight'}
          {role === 'Detective' && '🔵 You are the Detective — investigate a suspect'}
          {role === 'Citizen' && '⚪ You are a Citizen — sleep tight...'}
        </div>

        {/* Dead indicator */}
        {!isAlive && (
          <div className="rounded-2xl bg-slate-800/60 border border-slate-600 text-slate-400 text-center py-6">
            <div className="text-4xl mb-2">💀</div>
            <p className="font-semibold">You are dead.</p>
            <p className="text-sm text-slate-500">Watch silently as the game unfolds.</p>
          </div>
        )}

        {/* Action panel */}
        {isAlive && (
          <div className="animate-slide-up">
            {role === 'Mafia' && (
              <MafiaActionPanel
                alivePlayers={alivePlayers.filter(p => !mafiaTeammateIds.has(p.playerId) && p.playerId !== playerId)}
                mafiaVotes={mafiaVotes}
                playerId={playerId}
                mafiaTeammates={mafiaTeammates}
                onSubmit={(targetId) => handleSubmitAction('MafiaKill', targetId)}
                submitted={hasSubmittedNightAction}
              />
            )}
            {role === 'Doctor' && (
              <DoctorActionPanel
                alivePlayers={alivePlayers}
                onSubmit={(targetId) => handleSubmitAction('DoctorProtect', targetId)}
                submitted={hasSubmittedNightAction}
              />
            )}
            {role === 'Detective' && (
              <DetectiveActionPanel
                alivePlayers={alivePlayers.filter(p => p.playerId !== playerId)}
                onSubmit={(targetId) => handleSubmitAction('DetectiveInvestigate', targetId)}
                submitted={hasSubmittedNightAction}
              />
            )}
            {role === 'Citizen' && (
              <CitizenActionPanel
                onSubmit={() => handleSubmitAction('CitizenSkip')}
                submitted={hasSubmittedNightAction}
              />
            )}
          </div>
        )}

        {/* Mafia channel */}
        {role === 'Mafia' && mafiaTeammates.length > 0 && (
          <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-4">
            <h3 className="text-xs text-red-400 uppercase tracking-widest font-semibold mb-3">
              🔴 Mafia Channel
            </h3>
            <div className="space-y-2">
              {mafiaTeammates.map(m => {
                const vote = Object.entries(mafiaVotes).find(([voterId]) => voterId === m.playerId)
                const targetName = vote ? alivePlayers.find(p => p.playerId === vote[1])?.name : null
                return (
                  <div key={m.playerId} className="flex items-center justify-between text-sm">
                    <span className="text-red-200 font-medium">{m.name}</span>
                    <span className="text-slate-400">
                      {targetName ? `→ 🎯 ${targetName}` : '⏳ deciding...'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Player list */}
        <PlayerList players={alivePlayers} currentPlayerId={playerId} compact />
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
