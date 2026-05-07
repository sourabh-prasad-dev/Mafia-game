import axios from 'axios'

// In dev: VITE_API_URL is undefined → baseURL is '/api' → Vite proxy forwards to localhost:5000
// In prod: VITE_API_URL is 'https://your-app.railway.app' → calls backend directly
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

export interface CreateRoomResponse {
  roomCode: string
  playerId: string
  playerName: string
  isHost: boolean
}

export interface JoinRoomResponse {
  roomCode: string
  playerId: string
  playerName: string
  isHost: boolean
  players: { playerId: string; name: string; isHost: boolean }[]
}

export const createRoom = async (hostName: string): Promise<CreateRoomResponse> => {
  const res = await api.post<CreateRoomResponse>('/room/create', { hostName })
  return res.data
}

export const joinRoom = async (roomCode: string, playerName: string): Promise<JoinRoomResponse> => {
  const res = await api.post<JoinRoomResponse>('/room/join', { roomCode, playerName })
  return res.data
}

export const getRoom = async (code: string) => {
  const res = await api.get(`/room/${code}`)
  return res.data
}
