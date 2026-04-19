import { randomUUID } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import { redis } from './redis'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genCode = customAlphabet(CODE_ALPHABET, 6)

const ROOM_TTL_SEC = 60 * 60

export type RoomPlayer = {
  userId: string
  username: string
  elo: number
  avatarUrl: string | null
  joinedAt: number
}

export type Room = {
  code: string
  matchId: string
  hostId: string
  status: 'waiting' | 'active' | 'finished'
  createdAt: number
  players: RoomPlayer[]
}

export type RoomEvent =
  | { type: 'player_joined'; player: RoomPlayer }
  | { type: 'player_left'; userId: string }
  | { type: 'game_start'; matchId: string }

const roomKey = (code: string) => `room:${code}`
const roomChannel = (code: string) => `room:${code}:events`

async function readRoom(code: string): Promise<Room | null> {
  const json = await redis.get(roomKey(code))
  return json ? (JSON.parse(json) as Room) : null
}

async function writeRoom(room: Room): Promise<void> {
  await redis.set(roomKey(room.code), JSON.stringify(room), 'EX', ROOM_TTL_SEC)
}

async function publishEvent(code: string, event: RoomEvent): Promise<void> {
  await redis.publish(roomChannel(code), JSON.stringify(event))
}

export async function createRoom(host: RoomPlayer): Promise<Room> {
  for (let i = 0; i < 5; i++) {
    const code = genCode()
    const exists = await redis.exists(roomKey(code))
    if (exists) continue
    const room: Room = {
      code,
      matchId: randomUUID(),
      hostId: host.userId,
      status: 'waiting',
      createdAt: Date.now(),
      players: [host],
    }
    await writeRoom(room)
    return room
  }
  throw new Error('Failed to generate unique room code')
}

export async function getRoom(code: string): Promise<Room | null> {
  return readRoom(code)
}

export async function joinRoom(code: string, player: RoomPlayer): Promise<Room> {
  const room = await readRoom(code)
  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.status !== 'waiting') throw new Error('ROOM_NOT_WAITING')
  if (room.players.find((p) => p.userId === player.userId)) return room

  room.players.push(player)
  await writeRoom(room)
  await publishEvent(code, { type: 'player_joined', player })
  return room
}

export async function leaveRoom(code: string, userId: string): Promise<void> {
  const room = await readRoom(code)
  if (!room) return
  const before = room.players.length
  room.players = room.players.filter((p) => p.userId !== userId)
  if (room.players.length === before) return

  await publishEvent(code, { type: 'player_left', userId })

  // If host left or room is now empty, dissolve it
  if (room.hostId === userId || room.players.length === 0) {
    await redis.del(roomKey(code))
    return
  }
  await writeRoom(room)
}

export async function startRoom(
  code: string,
  hostId: string,
  opts: { bypassMinPlayers?: boolean } = {},
): Promise<Room> {
  const room = await readRoom(code)
  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.hostId !== hostId) throw new Error('NOT_HOST')
  if (room.status !== 'waiting') throw new Error('ALREADY_STARTED')
  if (!opts.bypassMinPlayers && room.players.length < 2) throw new Error('NOT_ENOUGH_PLAYERS')

  room.status = 'active'
  await writeRoom(room)
  await publishEvent(code, { type: 'game_start', matchId: room.matchId })
  return room
}
