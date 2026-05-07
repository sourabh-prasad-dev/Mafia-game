import { useState } from 'react'
import { GamePlayer } from '../../store/gameStore'

interface Props {
  alivePlayers: GamePlayer[]
  onSubmit: (targetId: string) => void
  submitted: boolean
}

export default function DoctorActionPanel({ alivePlayers, onSubmit, submitted }: Props) {
  const [selected, setSelected] = useState('')

  return (
    <div className="bg-green-950/50 border border-green-700/40 rounded-2xl p-5 glow-green">
      <h3 className="text-green-300 font-bold text-sm mb-1 flex items-center gap-2">
        🟢 Doctor — Protect
      </h3>
      <p className="text-green-400/70 text-xs mb-4">
        {submitted ? '✓ Protection submitted.' : 'Choose one player to protect tonight. (Cannot protect same player twice in a row.)'}
      </p>

      <select
        id="doctorTarget"
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full bg-green-950/80 border border-green-700/50 text-white rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-green-500 appearance-none"
      >
        <option value="">— Select player to protect —</option>
        {alivePlayers.map(p => (
          <option key={p.playerId} value={p.playerId}>{p.name}</option>
        ))}
      </select>

      <button
        id="submitDoctorProtect"
        onClick={() => selected && onSubmit(selected)}
        disabled={!selected || submitted}
        className={`w-full font-bold py-3 rounded-xl transition-all duration-200 text-sm ${
          submitted
            ? 'bg-green-900/60 text-green-400 border border-green-700 cursor-not-allowed'
            : !selected
            ? 'bg-green-900/30 text-green-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-800 to-green-600 hover:from-green-700 hover:to-green-500 text-white shadow-lg glow-green'
        }`}
      >
        {submitted ? '✓ Protected' : '🛡️ Protect Player'}
      </button>
    </div>
  )
}
