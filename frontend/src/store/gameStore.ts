import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'

export type GamePhase = 'Lobby' | 'Night' | 'NightReveal' | 'Day' | 'DayVote' | 'GameOver'
export type PlayerRole = 'Mafia' | 'Doctor' | 'Detective' | 'Citizen' | ''

export interface GamePlayer {
  playerId: string
  name: string
  isAlive: boolean
  isHost: boolean
}

export interface MafiaTeammate {
  playerId: string
  name: string
}

export interface KilledPlayerInfo {
  playerId: string
  name: string
  role?: string  // Only populated in GameOver reveal
}

export interface DetectiveResult {
  targetName: string
  isMafia: boolean
}

export interface MafiaVotes {
  [playerId: string]: string
}

export interface GameEvent {
  id: string
  icon: string
  title: string
  message: string
  accent: 'red' | 'gold' | 'blue' | 'green' | 'default'
}

export interface GameState {
  // Identity
  roomCode: string
  playerId: string
  playerName: string
  isHost: boolean
  role: PlayerRole
  mafiaTeammates: MafiaTeammate[]

  // Game state
  phase: GamePhase
  players: GamePlayer[]
  round: number

  // Night
  nightResult: { killedPlayer: KilledPlayerInfo | null; wasProtected: boolean } | null
  detectiveResult: DetectiveResult | null
  mafiaVotes: MafiaVotes
  hasSubmittedNightAction: boolean

  // Day vote
  dayVoteCounts: Record<string, number>
  voterToTarget: Record<string, string>  // voterId -> targetId
  myDayVote: string | null
  hasSubmittedDayVote: boolean
  dayVoteResult: { eliminatedPlayer: KilledPlayerInfo | null; wasTied: boolean } | null
  votedPlayerIds: string[]

  // Timer
  timerSeconds: number

  // Game over
  winningFaction: string
  allPlayersReveal: Array<{ playerId: string; name: string; role: string; isAlive: boolean }>

  // Event modal
  activeEvent: GameEvent | null

  // Actions
  setIdentity: (data: { roomCode: string; playerId: string; playerName: string; isHost: boolean }) => void
  setGameStarted: (data: { yourRole: string; mafiaTeammates: MafiaTeammate[] | null; playerId: string }) => void
  setPhase: (phase: GamePhase, players: GamePlayer[], round: number) => void
  setNightResult: (result: { killedPlayer: KilledPlayerInfo | null; wasProtected: boolean }) => void
  setDetectiveResult: (result: DetectiveResult) => void
  setMafiaVotes: (votes: MafiaVotes) => void
  setNightActionSubmitted: () => void
  setDayVoteResult: (result: { eliminatedPlayer: KilledPlayerInfo | null; wasTied: boolean }) => void
  updateDayVoteCounts: (voteCounts: Record<string, number>, votedPlayerIds: string[], voterToTarget: Record<string, string>) => void
  setMyDayVote: (targetId: string) => void
  setTimerSeconds: (s: number) => void
  setGameOver: (data: { winningFaction: string; allPlayers: Array<{ playerId: string; name: string; role: string; isAlive: boolean }> }) => void
  resetForNewGame: () => void
  showEvent: (event: Omit<GameEvent, 'id'>) => void
  clearEvent: () => void
}

const initialState = {
  roomCode: '',
  playerId: '',
  playerName: '',
  isHost: false,
  role: '' as PlayerRole,
  mafiaTeammates: [],
  phase: 'Lobby' as GamePhase,
  players: [],
  round: 0,
  nightResult: null,
  detectiveResult: null,
  mafiaVotes: {},
  hasSubmittedNightAction: false,
  dayVoteCounts: {},
  voterToTarget: {},
  myDayVote: null,
  hasSubmittedDayVote: false,
  dayVoteResult: null,
  votedPlayerIds: [],
  timerSeconds: 0,
  winningFaction: '',
  allPlayersReveal: [],
  activeEvent: null,
}

export const useGameStore = create<GameState>()(
  persist(
    immer((set) => ({
      ...initialState,

      setIdentity: (data) => set((s) => {
        s.roomCode = data.roomCode
        s.playerId = data.playerId
        s.playerName = data.playerName
        s.isHost = data.isHost
      }),

      setGameStarted: (data) => set((s) => {
        s.role = data.yourRole as PlayerRole
        s.mafiaTeammates = data.mafiaTeammates ?? []
        s.hasSubmittedNightAction = false
      }),

      setPhase: (phase, players, round) => set((s) => {
        s.phase = phase
        s.players = players
        s.round = round
        s.hasSubmittedNightAction = false
        s.hasSubmittedDayVote = false
        s.myDayVote = null
        s.dayVoteCounts = {}
        s.voterToTarget = {}
        s.votedPlayerIds = []
        if (phase === 'Night') {
          s.nightResult = null
          s.detectiveResult = null
          s.mafiaVotes = {}
        }
      }),

      setNightResult: (result) => set((s) => { s.nightResult = result }),
      setDetectiveResult: (result) => set((s) => { s.detectiveResult = result }),
      setMafiaVotes: (votes) => set((s) => { s.mafiaVotes = votes }),
      setNightActionSubmitted: () => set((s) => { s.hasSubmittedNightAction = true }),
      setDayVoteResult: (result) => set((s) => { s.dayVoteResult = result }),

      updateDayVoteCounts: (voteCounts, votedPlayerIds, voterToTarget) => set((s) => {
        s.dayVoteCounts = voteCounts
        s.votedPlayerIds = votedPlayerIds
        s.voterToTarget = voterToTarget
      }),

      setMyDayVote: (targetId) => set((s) => {
        s.myDayVote = targetId
        s.hasSubmittedDayVote = true
      }),

      setTimerSeconds: (seconds) => set((s) => { s.timerSeconds = seconds }),

      setGameOver: (data) => set((s) => {
        s.winningFaction = data.winningFaction
        s.allPlayersReveal = data.allPlayers
      }),

      resetForNewGame: () => set((s) => {
        const { roomCode, playerId, playerName, isHost } = s
        Object.assign(s, initialState)
        s.roomCode = roomCode
        s.playerId = playerId
        s.playerName = playerName
        s.isHost = isHost
      }),

      showEvent: (event) => set((s) => {
        s.activeEvent = { ...event, id: Date.now().toString() }
      }),

      clearEvent: () => set((s) => { s.activeEvent = null }),
    })),
    {
      name: 'mafia-game',
      // Exclude transient state from localStorage
      partialize: (state) => ({
        roomCode: state.roomCode,
        playerId: state.playerId,
        playerName: state.playerName,
        isHost: state.isHost,
        role: state.role,
        mafiaTeammates: state.mafiaTeammates,
        phase: state.phase,
        players: state.players,
        round: state.round,
        nightResult: state.nightResult,
        detectiveResult: state.detectiveResult,
        mafiaVotes: state.mafiaVotes,
        hasSubmittedNightAction: state.hasSubmittedNightAction,
        dayVoteCounts: state.dayVoteCounts,
        voterToTarget: state.voterToTarget,
        myDayVote: state.myDayVote,
        hasSubmittedDayVote: state.hasSubmittedDayVote,
        dayVoteResult: state.dayVoteResult,
        votedPlayerIds: state.votedPlayerIds,
        winningFaction: state.winningFaction,
        allPlayersReveal: state.allPlayersReveal,
        // timerSeconds and activeEvent are intentionally excluded
      })
    }
  )
)
