import { useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { useGameStore } from '../store/gameStore'

// In dev: VITE_BACKEND_URL is undefined → '/hubs/game' → Vite proxy handles it
// In prod: VITE_BACKEND_URL = 'https://your-app.railway.app'
const BACKEND = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')
const HUB_URL = `${BACKEND}/hubs/game`

let connection: signalR.HubConnection | null = null

export function useSignalR() {
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  const connect = useCallback(async () => {
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      connectionRef.current = connection
      return connection
    }

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000]) // retry schedule
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // ── Event handlers ──────────────────────────────────────────────────────

    conn.on('PlayerJoined', (data: { playerName: string; playerCount: number; players: Array<{ playerId: string; name: string; isHost: boolean; isAlive: boolean }> }) => {
      const store = useGameStore.getState()
      store.setPhase(
        store.phase,
        data.players,
        store.round
      )

      // Sync player's own isHost flag from server data
      const me = data.players.find(p => p.playerId === store.playerId)
      if (me && me.isHost !== store.isHost) {
        store.setIdentity({
          roomCode: store.roomCode,
          playerId: store.playerId,
          playerName: store.playerName,
          isHost: me.isHost
        })
      }
    })

    conn.on('PlayerLeft', (data: { playerName: string; playerCount: number; players: Array<{ playerId: string; name: string; isHost: boolean; isAlive: boolean }> }) => {
      const store = useGameStore.getState()
      store.setPhase(
        store.phase,
        data.players,
        store.round
      )

      // Sync player's own isHost flag from server data
      const me = data.players.find(p => p.playerId === store.playerId)
      if (me && me.isHost !== store.isHost) {
        store.setIdentity({
          roomCode: store.roomCode,
          playerId: store.playerId,
          playerName: store.playerName,
          isHost: me.isHost
        })
      }
    })

    conn.on('RoomStateSync', (data: {
      phase: string;
      players: Array<{ playerId: string; name: string; isAlive: boolean; isHost: boolean }>;
      round: number;
      yourRole?: string;
      mafiaTeammates?: Array<{ playerId: string; name: string }> | null;
      hasSubmittedNightAction?: boolean;
      hasSubmittedDayVote?: boolean;
      myDayVote?: string | null;
      dayVoteCounts?: Record<string, number>;
      voterToTarget?: Record<string, string>;
      votedPlayerIds?: string[];
    }) => {
      const store = useGameStore.getState()
      const phase = data.phase as import('../store/gameStore').GamePhase

      // Update phase + players
      store.setPhase(phase, data.players, data.round)

      // Restore role info (important after mid-game refresh)
      if (data.yourRole && data.yourRole !== 'Citizen') {
        store.setGameStarted({
          yourRole: data.yourRole,
          mafiaTeammates: data.mafiaTeammates ?? null,
          playerId: store.playerId
        })
      } else if (data.yourRole) {
        store.setGameStarted({
          yourRole: data.yourRole,
          mafiaTeammates: null,
          playerId: store.playerId
        })
      }

      // Restore host flag from server data
      const me = data.players.find(p => p.playerId === store.playerId)
      if (me && me.isHost !== store.isHost) {
        store.setIdentity({
          roomCode: store.roomCode,
          playerId: store.playerId,
          playerName: store.playerName,
          isHost: me.isHost
        })
      }

      // Restore vote state
      if (data.dayVoteCounts && data.voterToTarget && data.votedPlayerIds) {
        store.updateDayVoteCounts(data.dayVoteCounts, data.votedPlayerIds, data.voterToTarget)
      }
      if (data.hasSubmittedDayVote && data.myDayVote) {
        store.setMyDayVote(data.myDayVote)
      }
    })

    conn.on('GameStarted', (data: { yourRole: string; mafiaTeammates: Array<{ playerId: string; name: string }> | null; playerId: string }) => {
      useGameStore.getState().setGameStarted(data)
    })

    conn.on('PhaseChanged', (data: { phase: string; players: Array<{ playerId: string; name: string; isAlive: boolean }>; round: number }) => {
      const store = useGameStore.getState()
      const phase = data.phase as import('../store/gameStore').GamePhase
      const players = data.players.map(p => ({
        playerId: p.playerId,
        name: p.name,
        isAlive: p.isAlive,
        isHost: store.players.find(x => x.playerId === p.playerId)?.isHost ?? false
      }))
      store.setPhase(phase, players, data.round)

      // ── Event popups per phase ──────────────────────────────────────────
      if (phase === 'Night') {
        store.showEvent({
          icon: '🌙',
          title: 'Night Falls',
          message: `Round ${data.round} — The village sleeps. Complete your night action.`,
          accent: 'default'
        })
      }
      if (phase === 'Day') {
        store.showEvent({
          icon: '☀️',
          title: 'A New Day Begins',
          message: `Round ${data.round} — Discuss with the village and find the Mafia. The host will open voting when ready.`,
          accent: 'gold'
        })
      }
      if (phase === 'DayVote') {
        store.showEvent({
          icon: '🗳️',
          title: 'Voting Has Begun!',
          message: 'Vote to eliminate a player you suspect is Mafia. Most votes wins.',
          accent: 'gold'
        })
      }
    })

    conn.on('MafiaVoteUpdated', (data: { votes: Record<string, string> }) => {
      useGameStore.getState().setMafiaVotes(data.votes)
    })

    conn.on('DetectiveResult', (data: { targetName: string; isMafia: boolean }) => {
      useGameStore.getState().setDetectiveResult(data)
    })

    conn.on('NightResolved', (data: { killedPlayer: { playerId: string; name: string } | null; wasProtected: boolean }) => {
      const store = useGameStore.getState()
      store.setNightResult(data)

      if (data.wasProtected) {
        store.showEvent({
          icon: '🛡️',
          title: 'The Town Was Peaceful',
          message: 'The Doctor\'s protection saved someone last night. Nobody died.',
          accent: 'green'
        })
      } else if (data.killedPlayer) {
        store.showEvent({
          icon: '💀',
          title: 'Someone Died Last Night',
          message: `${data.killedPlayer.name} was found dead this morning.`,
          accent: 'red'
        })
      } else {
        store.showEvent({
          icon: '🌄',
          title: 'A Quiet Night',
          message: 'Nobody died last night.',
          accent: 'default'
        })
      }
    })

    conn.on('DayVoteResult', (data: { eliminatedPlayer: { playerId: string; name: string } | null; wasTied: boolean }) => {
      const store = useGameStore.getState()
      store.setDayVoteResult(data)

      if (data.wasTied || !data.eliminatedPlayer) {
        store.showEvent({
          icon: '⚖️',
          title: 'Vote Was Tied!',
          message: 'No majority reached — nobody was eliminated. Night falls again...',
          accent: 'default'
        })
      } else {
        store.showEvent({
          icon: '⚖️',
          title: 'Player Eliminated!',
          message: `${data.eliminatedPlayer.name} has been voted out of the village.`,
          accent: 'red'
        })
      }
    })

    conn.on('VoteCountUpdated', (data: { voteCounts: Record<string, number>; votedPlayerIds: string[]; voterToTarget: Record<string, string> }) => {
      useGameStore.getState().updateDayVoteCounts(data.voteCounts, data.votedPlayerIds, data.voterToTarget)
    })

    conn.on('TimerUpdate', (data: { secondsRemaining: number }) => {
      useGameStore.getState().setTimerSeconds(data.secondsRemaining)
    })

    conn.on('GameOver', (data: { winningFaction: string; allPlayers: Array<{ playerId: string; name: string; role: string; isAlive: boolean }> }) => {
      const store = useGameStore.getState()
      store.setGameOver(data)
      store.showEvent({
        icon: data.winningFaction === 'Mafia' ? '🔴' : '🏆',
        title: data.winningFaction === 'Mafia' ? 'Mafia Wins!' : 'Town Wins!',
        message: data.winningFaction === 'Mafia'
          ? 'The shadows have consumed the village. The Mafia reigns.'
          : 'All Mafia members have been eliminated. Justice prevails!',
        accent: data.winningFaction === 'Mafia' ? 'red' : 'gold'
      })
    })

    conn.on('GameReset', (data: { players: Array<{ playerId: string; name: string; isHost: boolean }>; roomCode: string }) => {
      const store = useGameStore.getState()
      store.resetForNewGame()
      const mapped = data.players.map(p => ({ ...p, isAlive: true }))
      store.setPhase('Lobby', mapped, 0)

      // Sync player's own isHost flag from server data after reset
      const me = data.players.find(p => p.playerId === store.playerId)
      if (me && me.isHost !== store.isHost) {
        store.setIdentity({
          roomCode: store.roomCode,
          playerId: store.playerId,
          playerName: store.playerName,
          isHost: me.isHost
        })
      }
    })

    conn.on('Error', (msg: string) => {
      console.error('[GameHub Error]', msg)
    })

    // Fired when RegisterPlayer is called but the player was already purged after the grace period.
    // The client should clear state and redirect home so they don't get stuck on a dead lobby.
    conn.on('KickedFromRoom', () => {
      useGameStore.getState().fullReset()
      localStorage.removeItem('mafia-game')
      // Navigate to home — use window.location so it works outside React Router context
      window.location.href = '/'
    })

    // ── Auto-reconnect: re-register with server when SignalR reconnects ──
    conn.onreconnected(async () => {
      const store = useGameStore.getState()
      if (store.roomCode && store.playerId) {
        try {
          await conn.invoke('RegisterPlayer', store.roomCode, store.playerId)
        } catch (e) {
          console.error('[SignalR] Failed to re-register after reconnect', e)
        }
      }
    })

    await conn.start()
    connection = conn
    connectionRef.current = conn
    return conn
  }, [])

  useEffect(() => {
    return () => {
      // Keep connection alive across page navigations
    }
  }, [])

  const invoke = useCallback(async (method: string, ...args: unknown[]) => {
    const conn = connectionRef.current ?? connection
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      console.warn('SignalR not connected, cannot invoke', method)
      return
    }
    await conn.invoke(method, ...args)
  }, [])

  return { connect, invoke, connectionRef }
}
