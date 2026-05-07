import { GamePlayer } from '../store/gameStore'

interface Props {
  alivePlayers: GamePlayer[]
  allPlayers: GamePlayer[]      // for resolving voter names
  dayVoteCounts: Record<string, number>
  voterToTarget: Record<string, string>
  votedPlayerIds: string[]
  myVote: string | null
  playerId: string
  onVote: (targetId: string) => void
}

export default function VotingPanel({
  alivePlayers,
  allPlayers,
  dayVoteCounts,
  voterToTarget,
  votedPlayerIds,
  myVote,
  playerId,
  onVote,
}: Props) {
  const totalVotes = Object.values(dayVoteCounts).reduce((a, b) => a + b, 0)

  // Build reverse map: targetId → list of voter names
  const votersByTarget: Record<string, string[]> = {}
  for (const [voterId, targetId] of Object.entries(voterToTarget)) {
    const voterName = allPlayers.find(p => p.playerId === voterId)?.name ?? voterId
    if (!votersByTarget[targetId]) votersByTarget[targetId] = []
    votersByTarget[targetId].push(voterName)
  }

  return (
    <div className="bg-white/80 border border-amber-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-amber-900 font-bold text-sm mb-1">🗳️ Vote to Eliminate</h3>
      <p className="text-amber-600 text-xs mb-4">
        {myVote
          ? '✓ Vote submitted — you can change it before time runs out.'
          : 'Select a player you suspect is Mafia.'}
      </p>

      <div className="space-y-3">
        {alivePlayers.map(p => {
          const votes = dayVoteCounts[p.playerId] ?? 0
          const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0
          const isMyVote = myVote === p.playerId
          const votersForThis = votersByTarget[p.playerId] ?? []

          return (
            <button
              key={p.playerId}
              id={`vote-${p.playerId}`}
              onClick={() => onVote(p.playerId)}
              className={`w-full text-left rounded-xl border transition-all duration-200 overflow-hidden ${
                isMyVote
                  ? 'border-amber-500 bg-amber-100 shadow-md'
                  : 'border-amber-100 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              {/* Candidate header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 font-semibold text-amber-900 text-sm">{p.name}</span>
                {isMyVote && (
                  <span className="text-amber-600 text-xs font-bold bg-amber-200 px-2 py-0.5 rounded-full">
                    ✓ My Vote
                  </span>
                )}
                {votes > 0 && (
                  <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                    {votes} vote{votes !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Vote bar */}
              {pct > 0 && (
                <div className="h-1 bg-amber-100">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {/* Who voted for this player */}
              {votersForThis.length > 0 && (
                <div className="px-4 py-2 bg-amber-50/60 border-t border-amber-100">
                  <p className="text-xs text-amber-600">
                    <span className="font-semibold">Voted by: </span>
                    {votersForThis.join(', ')}
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-amber-400 text-xs text-center mt-4">
        {totalVotes} of {alivePlayers.length} votes cast
      </p>
    </div>
  )
}
