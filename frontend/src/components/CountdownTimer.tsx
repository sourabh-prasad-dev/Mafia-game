import { useTimer } from '../hooks/useTimer'
import { useGameStore } from '../store/gameStore'

interface Props {
  light?: boolean
}

export default function CountdownTimer({ light }: Props) {
  const seconds = useTimer()
  const phase = useGameStore((s) => s.phase)

  const maxSeconds = phase === 'Night' ? 60 : phase === 'DayVote' ? 60 : 90
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progress = seconds / maxSeconds
  const dashOffset = circumference * (1 - progress)

  const color = seconds <= 10 ? '#e74c3c' : light ? '#d97706' : '#a78bfa'
  const textColor = seconds <= 10 ? 'text-red-400' : light ? 'text-amber-700' : 'text-violet-300'

  return (
    <div className="flex items-center gap-3">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={radius} fill="none" stroke={light ? '#e5c88a' : '#1e1e33'} strokeWidth="5" />
        <circle
          cx="34" cy="34" r={radius} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="timer-ring"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        <text
          x="34" y="34" textAnchor="middle" dominantBaseline="central"
          fontSize="16" fontWeight="bold" fill={color} fontFamily="Inter, sans-serif"
        >
          {seconds}
        </text>
      </svg>
    </div>
  )
}
