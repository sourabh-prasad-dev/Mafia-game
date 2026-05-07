import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSignalR } from '../hooks/useSignalR'
import CountdownTimer from '../components/CountdownTimer'
import VotingPanel from '../components/VotingPanel'
import PlayerList from '../components/PlayerList'

export default function DayPage() {
  const {
    phase, players, playerId, isHost, round,
    dayVoteResult, dayVoteCounts, voterToTarget, votedPlayerIds, myDayVote, roomCode
  } = useGameStore()
  const { invoke } = useSignalR()
  const navigate = useNavigate()

  useEffect(() => {
    if (phase === 'Night') navigate('/night')
    if (phase === 'GameOver') navigate('/gameover')
  }, [phase, navigate])

  const me = players.find(p => p.playerId === playerId)
  const isAlive = me?.isAlive ?? false
  const alivePlayers = players.filter(p => p.isAlive)
  const isDayVotePhase = phase === 'DayVote'
  const isDiscussion = phase === 'Day'

  const handleVote = (targetId: string) => {
    invoke('SubmitDayVote', roomCode, targetId)
    useGameStore.getState().setMyDayVote(targetId)
  }

  const handleProceedToVote = () => {
    invoke('ProceedToVote', roomCode)
  }

  return (
    <div className="relative min-h-screen day-sky overflow-hidden flex flex-col">
      {/* Sun */}
      <div className="absolute top-4 right-6 text-5xl drop-shadow-lg">☀️</div>

      {/* Header */}
      <div className="relative z-10 text-center pt-8 pb-2 px-4">
        <p className="text-amber-800/60 text-xs uppercase tracking-widest mb-1">Round {round}</p>
        <h1 className="text-3xl font-display text-amber-900">
          {isDayVotePhase ? '🗳️ Time to Vote' : '☀️ Day Phase'}
        </h1>
        <p className="text-amber-700 text-sm mt-1">
          {isDayVotePhase ? 'Vote to eliminate a suspect' : 'Discuss and find the Mafia'}
        </p>
      </div>

      {/* Timer */}
      <div className="relative z-10 flex justify-center py-2">
        <CountdownTimer light />
      </div>

      {/* Host: Proceed to Vote button (discussion phase only) */}
      {isDiscussion && isHost && (
        <div className="relative z-10 px-4 mb-2 max-w-xl mx-auto w-full">
          <button
            id="proceedToVoteBtn"
            onClick={handleProceedToVote}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.01] text-sm"
          >
            ➡️ Proceed to Voting
          </button>
          <p className="text-center text-amber-600/60 text-xs mt-1">
            Host only — click when the village is ready to vote
          </p>
        </div>
      )}

      {/* Day vote result banner (shown briefly before next phase) */}
      {dayVoteResult && (
        <div className={`relative z-10 mx-4 mb-4 rounded-2xl p-4 text-center ${
          dayVoteResult.eliminatedPlayer
            ? 'bg-red-100 border border-red-300 text-red-800'
            : 'bg-slate-100 border border-slate-300 text-slate-700'
        }`}>
          {dayVoteResult.eliminatedPlayer ? (
            <p className="font-bold text-lg">⚖️ {dayVoteResult.eliminatedPlayer.name} has been eliminated!</p>
          ) : (
            <p className="font-bold">⚖️ The vote was tied — nobody was eliminated.</p>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 space-y-4 max-w-xl mx-auto w-full">

        {/* Voting panel (shown during vote phase for alive players) */}
        {isDayVotePhase && isAlive && (
          <VotingPanel
            alivePlayers={alivePlayers.filter(p => p.playerId !== playerId)}
            allPlayers={players}
            dayVoteCounts={dayVoteCounts}
            voterToTarget={voterToTarget}
            votedPlayerIds={votedPlayerIds}
            myVote={myDayVote}
            playerId={playerId}
            onVote={handleVote}
          />
        )}

        {/* Discussion helper card */}
        {isDiscussion && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-amber-900 font-bold text-sm mb-2">💬 Discussion Time</h3>
            <p className="text-amber-700 text-xs leading-relaxed">
              Share suspicions, defend yourself, and listen carefully.
              {isHost
                ? ' When the village is ready, click "Proceed to Voting" above.'
                : ' Waiting for the host to open voting...'}
            </p>
          </div>
        )}

        {/* Player list */}
        <div>
          <h3 className="text-amber-900/60 text-xs uppercase tracking-wider font-semibold mb-2">Village Status</h3>
          <PlayerList players={players} currentPlayerId={playerId} light />
        </div>

        {/* Dead player note */}
        {!isAlive && (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl text-center py-6">
            <div className="text-3xl mb-2">💀</div>
            <p className="text-slate-600 font-semibold text-sm">You are eliminated.</p>
            <p className="text-slate-400 text-xs">You may observe but cannot vote.</p>
          </div>
        )}
      </div>
    </div>
  )
}
