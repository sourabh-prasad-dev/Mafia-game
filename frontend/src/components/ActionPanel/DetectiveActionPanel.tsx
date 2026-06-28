import { useState } from 'react'
import { GamePlayer } from '../../store/gameStore'
import { useGameStore } from '../../store/gameStore'

interface Props {
  alivePlayers: GamePlayer[]
  onSubmit: (targetId: string) => void
  submitted: boolean
}

export default function DetectiveActionPanel({ alivePlayers, onSubmit, submitted }: Props) {
  const [selected, setSelected] = useState('')
  const detectiveResult = useGameStore((s) => s.detectiveResult)

  return (
    <div className="bg-blue-950/50 border border-blue-700/40 rounded-2xl p-5 glow-blue">
      <h3 className="text-blue-300 font-bold text-sm mb-1 flex items-center gap-2">
        🔵 Detective — Investigate
      </h3>
      <p className="text-blue-400/70 text-xs mb-4">
        {submitted ? '✓ Investigation submitted.' : 'Choose a player to investigate. You will privately learn if they are Mafia.'}
      </p>

      <select
        id="detectiveTarget"
        value={selected}
        onChange={e => setSelected(e.target.value)}
        disabled={submitted}
        className="w-full bg-blue-950/80 border border-blue-700/50 text-white rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-blue-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">— Select player to investigate —</option>
        {alivePlayers.map(p => (
          <option key={p.playerId} value={p.playerId}>{p.name}</option>
        ))}
      </select>

      <button
        id="submitDetectiveInvestigate"
        onClick={() => selected && onSubmit(selected)}
        disabled={!selected || submitted}
        className={`w-full font-bold py-3 rounded-xl transition-all duration-200 text-sm ${
          submitted
            ? 'bg-blue-900/60 text-blue-400 border border-blue-700 cursor-not-allowed'
            : !selected
            ? 'bg-blue-900/30 text-blue-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-700 hover:to-blue-500 text-white shadow-lg glow-blue'
        }`}
      >
        {submitted ? '✓ Investigating...' : '🔍 Investigate Player'}
      </button>

      {/* Private result */}
      {detectiveResult && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-center border ${
          detectiveResult.isMafia
            ? 'bg-red-950/60 border-red-700/40 text-red-300'
            : 'bg-green-950/60 border-green-700/40 text-green-300'
        }`}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1">Private Result</p>
          <p className="text-lg font-bold">
            {detectiveResult.isMafia ? '🔴 Mafia' : '🟢 Innocent'}
          </p>
          <p className="text-xs opacity-70 mt-1">
            {detectiveResult.targetName} is {detectiveResult.isMafia ? 'a member of the Mafia!' : 'not Mafia.'}
          </p>
        </div>
      )}
    </div>
  )
}
