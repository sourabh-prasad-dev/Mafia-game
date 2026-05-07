import { GamePlayer } from '../store/gameStore'

interface Props {
  players: GamePlayer[]
  currentPlayerId: string
  light?: boolean
  compact?: boolean
}

export default function PlayerList({ players, currentPlayerId, light, compact }: Props) {
  const allPlayers = players

  return (
    <div className={`rounded-2xl border p-4 ${light ? 'bg-amber-50/80 border-amber-200' : 'bg-night-card border-night-border'}`}>
      {!compact && (
        <h3 className={`text-xs uppercase tracking-wider font-semibold mb-3 ${light ? 'text-amber-700' : 'text-slate-400'}`}>
          👥 {allPlayers.length} Players
        </h3>
      )}
      <div className="space-y-1.5">
        {allPlayers.map(p => (
          <div
            key={p.playerId}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all ${
              p.playerId === currentPlayerId
                ? light ? 'bg-amber-100 border border-amber-300' : 'bg-night-surface border border-night-border'
                : light ? 'bg-transparent' : ''
            } ${!p.isAlive ? 'opacity-40' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              !p.isAlive ? 'bg-slate-700 text-slate-500' :
              light ? 'bg-amber-200 text-amber-800' : 'bg-slate-700 text-white'
            }`}>
              {!p.isAlive ? '💀' : p.name.charAt(0).toUpperCase()}
            </div>

            <span className={`text-sm font-medium flex-1 ${
              !p.isAlive
                ? (light ? 'text-slate-400 line-through' : 'text-slate-600 line-through')
                : (light ? 'text-amber-900' : 'text-white')
            }`}>
              {p.name}
            </span>

            {p.playerId === currentPlayerId && (
              <span className={`text-xs ${light ? 'text-amber-500' : 'text-slate-500'}`}>(you)</span>
            )}
            {p.isHost && (
              <span className="text-xs text-amber-400">👑</span>
            )}
            {!p.isAlive && (
              <span className={`text-xs ${light ? 'text-slate-400' : 'text-slate-600'}`}>Dead</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
