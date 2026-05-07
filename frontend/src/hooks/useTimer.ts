import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

export function useTimer() {
  const serverSeconds = useGameStore((s) => s.timerSeconds)
  const [display, setDisplay] = useState(serverSeconds)

  useEffect(() => {
    setDisplay(serverSeconds)
  }, [serverSeconds])

  return display
}
