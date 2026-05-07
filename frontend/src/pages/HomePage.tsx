import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, joinRoom } from '../services/api'
import { useGameStore } from '../store/gameStore'
import { useSignalR } from '../hooks/useSignalR'

export default function HomePage() {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { connect, invoke } = useSignalR()
  const setIdentity = useGameStore((s) => s.setIdentity)
  const setPhase = useGameStore((s) => s.setPhase)

  // Stars decoration
  const [stars] = useState(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 3,
    }))
  )

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter your name'); return }
    setLoading(true); setError('')
    try {
      const data = await createRoom(name.trim())
      setIdentity({ roomCode: data.roomCode, playerId: data.playerId, playerName: data.playerName, isHost: true })
      const conn = await connect()
      await conn.invoke('RegisterPlayer', data.roomCode, data.playerId)
      setPhase('Lobby', [{ playerId: data.playerId, name: data.playerName, isAlive: true, isHost: true }], 0)
      navigate('/lobby')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create room')
    } finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!code.trim()) { setError('Please enter the room code'); return }
    setLoading(true); setError('')
    try {
      const data = await joinRoom(code.toUpperCase().trim(), name.trim())
      setIdentity({ roomCode: data.roomCode, playerId: data.playerId, playerName: data.playerName, isHost: false })
      const conn = await connect()
      await conn.invoke('RegisterPlayer', data.roomCode, data.playerId)
      setPhase('Lobby', data.players.map((p: { playerId: string; name: string; isHost: boolean }) => ({ ...p, isAlive: true })), 0)
      navigate('/lobby')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join room')
    } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-night-bg">
      {/* Starfield */}
      <div className="stars-container">
        {stars.map(s => (
          <span
            key={s.id}
            className="star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              '--duration': `${s.duration}s`,
              '--delay': `${s.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-float-up">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎭</div>
          <h1 className="text-5xl font-display text-white tracking-wider mb-2">MAFIA</h1>
          <p className="text-slate-400 text-sm">The town has a secret. Trust no one. Sleep with one eye open.</p>
        </div>

        <div className="bg-night-card border border-night-border rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          {/* Tabs */}
          <div className="flex rounded-xl bg-night-bg overflow-hidden mb-6">
            {(['create', 'join'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 capitalize ${
                  tab === t
                    ? 'bg-mafia-red text-white shadow-inner'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'create' ? '🏠 Create Room' : '🚪 Join Room'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
                placeholder="Enter your display name..."
                maxLength={20}
                className="w-full bg-night-bg border border-night-border text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-mafia-red focus:ring-1 focus:ring-mafia-red transition-all"
              />
            </div>

            {tab === 'join' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Room Code
                </label>
                <input
                  id="roomCode"
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-night-bg border border-night-border text-white rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] placeholder-slate-600 focus:outline-none focus:border-mafia-red focus:ring-1 focus:ring-mafia-red transition-all uppercase"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              id={tab === 'create' ? 'createRoomBtn' : 'joinRoomBtn'}
              onClick={tab === 'create' ? handleCreate : handleJoin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-mafia-darkred to-mafia-red hover:from-mafia-red hover:to-mafia-glow text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed glow-red"
            >
              {loading ? '⏳ Connecting...' : tab === 'create' ? '🏠 Create Room' : '🚪 Join Game'}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          4–20 players · Roles assigned by server · No moderator needed
        </p>
      </div>
    </div>
  )
}
