import { useState } from 'react'
import { GamePlayer } from '../../store/gameStore'

interface Props {
  alivePlayers: GamePlayer[]
  mafiaVotes: Record<string, string>
  playerId: string
  mafiaTeammates: { playerId: string; name: string }[]
  onSubmit: (targetId: string) => void
  submitted: boolean
}

export default function MafiaActionPanel({ alivePlayers, mafiaVotes, playerId, onSubmit, submitted }: Props) {
  const [selected, setSelected] = useState('')

  const myVoteTargetId = mafiaVotes[playerId]

  const handleSubmit = () => {
    if (!selected) return
    onSubmit(selected)
  }

  return (
    <div className="bg-red-950/60 border border-red-700/40 rounded-2xl p-5 glow-red">
      <h3 className="text-red-300 font-bold text-sm mb-1 flex items-center gap-2">
        🔴 Mafia Kill
      </h3>
      <p className="text-red-400/70 text-xs mb-4">
        {submitted ? `✓ You voted to eliminate ${alivePlayers.find(p => p.playerId === (selected || myVoteTargetId))?.name ?? '...'}` : 'Choose a player to eliminate tonight. All Mafia must vote.'}
      </p>

      <select
        id="mafiaTarget"
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full bg-red-950/80 border border-red-700/50 text-white rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-red-500 appearance-none"
      >
        <option value="">— Select target —</option>
        {alivePlayers.map(p => (
          <option key={p.playerId} value={p.playerId}>{p.name}</option>
        ))}
      </select>

      <button
        id="submitMafiaKill"
        onClick={handleSubmit}
        disabled={!selected}
        className={`w-full font-bold py-3 rounded-xl transition-all duration-200 text-sm ${
          !selected
            ? 'bg-red-900/40 text-red-600 cursor-not-allowed'
            : submitted
            ? 'bg-red-800/70 text-red-300 border border-red-700'
            : 'bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white shadow-lg'
        }`}
      >
        {submitted ? '🔄 Change Vote' : '🎯 Submit Kill Vote'}
      </button>
    </div>
  )
}
