import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useGameStore } from './store/gameStore'
import { useSignalR } from './hooks/useSignalR'
import EventModal from './components/EventModal'
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import NightPage from './pages/NightPage'
import NightRevealPage from './pages/NightRevealPage'
import DayPage from './pages/DayPage'
import GameOverPage from './pages/GameOverPage'

function AppInner() {
  const phase = useGameStore((s) => s.phase)
  const roomCode = useGameStore((s) => s.roomCode)
  const playerId = useGameStore((s) => s.playerId)
  const { connect } = useSignalR()
  const navigate = useNavigate()

  // Auto-reconnect SignalR on page refresh if persisted state exists
  useEffect(() => {
    if (roomCode && playerId) {
      connect()
        .then(conn => conn.invoke('RegisterPlayer', roomCode, playerId))
        .catch(console.error)
    }
  }, []) // intentionally only on mount

  // Keep URL in sync with game phase — only when inside a room
  useEffect(() => {
    if (!roomCode) return          // ← don't redirect when leaving
    navigate(getPhaseRoute(phase), { replace: true })
  }, [phase, roomCode])

  if (!roomCode) {
    return <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={getPhaseRoute(phase)} replace />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/night" element={<NightPage />} />
        <Route path="/night-reveal" element={<NightRevealPage />} />
        <Route path="/day" element={<DayPage />} />
        <Route path="/gameover" element={<GameOverPage />} />
        <Route path="*" element={<Navigate to={getPhaseRoute(phase)} replace />} />
      </Routes>

      {/* Global event popup — rendered above everything */}
      <EventModal />
    </>
  )
}

function getPhaseRoute(phase: string): string {
  switch (phase) {
    case 'Lobby':      return '/lobby'
    case 'Night':      return '/night'
    case 'NightReveal':return '/night-reveal'
    case 'Day':
    case 'DayVote':    return '/day'
    case 'GameOver':   return '/gameover'
    default:           return '/lobby'
  }
}

export default function App() {
  return <AppInner />
}
