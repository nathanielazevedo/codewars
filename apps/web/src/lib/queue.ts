import { randomUUID } from 'node:crypto'
import { QUICKMATCH, type QueuedPlayer, type QueueStatus } from '@code-arena/types'
import { redis } from './redis'
import { censorProfanity } from './chat-mod'

const MEMBERS_KEY = 'queue:quickmatch:members'
const PLAYERS_KEY = 'queue:quickmatch:players'
const COUNTDOWN_KEY = 'queue:quickmatch:countdown'
const EVENTS_CHANNEL = 'queue:quickmatch:events'
const CHAT_KEY = 'queue:quickmatch:chat'
const CHAT_HISTORY_LIMIT = 50
const CHAT_TTL_SEC = 60 * 15
export const QUEUE_CHAT_MAX_LENGTH = 280

export type QueueChatMessage = {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  text: string
  sentAt: number
}

type QueueEvent =
  | { type: 'update'; count: number; countdownEnds: number | null; players: QueuedPlayer[] }
  | { type: 'matched'; matchId: string; userIds: string[] }
  | { type: 'chat_message'; message: QueueChatMessage }

async function listQueuePlayers(): Promise<QueuedPlayer[]> {
  // Members are sorted by joinedAt ASC in the zset; preserve that order for the list.
  const userIds = await redis.zrange(MEMBERS_KEY, 0, -1)
  if (userIds.length === 0) return []
  const rows = await redis.hmget(PLAYERS_KEY, ...userIds)
  const out: QueuedPlayer[] = []
  for (const row of rows) {
    if (!row) continue
    try {
      out.push(JSON.parse(row) as QueuedPlayer)
    } catch {
      /* skip corrupt entry */
    }
  }
  return out
}

async function publishUpdate(): Promise<{
  count: number
  countdownEnds: number | null
  players: QueuedPlayer[]
}> {
  const [count, ends, players] = await Promise.all([
    redis.zcard(MEMBERS_KEY),
    redis.get(COUNTDOWN_KEY),
    listQueuePlayers(),
  ])
  const countdownEnds = ends ? Number(ends) : null
  const ev: QueueEvent = { type: 'update', count, countdownEnds, players }
  await redis.publish(EVENTS_CHANNEL, JSON.stringify(ev))
  return { count, countdownEnds, players }
}

export async function joinQuickmatch(
  player: QueuedPlayer,
): Promise<QueueStatus> {
  // Idempotent: don't overwrite joinedAt if already present
  const existing = await redis.zscore(MEMBERS_KEY, player.userId)
  if (!existing) {
    await redis.zadd(MEMBERS_KEY, player.joinedAt, player.userId)
    await redis.hset(PLAYERS_KEY, player.userId, JSON.stringify(player))
  }

  const count = await redis.zcard(MEMBERS_KEY)
  const effectiveMin = player.isAdmin ? 1 : QUICKMATCH.MIN_PLAYERS

  // Start countdown when we have enough players and none is running
  if (count >= effectiveMin && count < QUICKMATCH.MAX_PLAYERS) {
    const existingEnds = await redis.get(COUNTDOWN_KEY)
    if (!existingEnds) {
      const ends = Date.now() + QUICKMATCH.COUNTDOWN_MS
      // Give it a generous TTL so stale state doesn't linger forever
      await redis.set(COUNTDOWN_KEY, String(ends), 'PX', QUICKMATCH.COUNTDOWN_MS + 30000)
    }
  }

  const { count: newCount, countdownEnds, players } = await publishUpdate()
  return { inQueue: true, count: newCount, countdownEnds, players }
}

export async function leaveQuickmatch(userId: string): Promise<QueueStatus> {
  const removed = await redis.zrem(MEMBERS_KEY, userId)
  if (removed) await redis.hdel(PLAYERS_KEY, userId)

  const count = await redis.zcard(MEMBERS_KEY)
  if (count < QUICKMATCH.MIN_PLAYERS) {
    await redis.del(COUNTDOWN_KEY)
  }

  const { count: newCount, countdownEnds, players } = await publishUpdate()
  return { inQueue: false, count: newCount, countdownEnds, players }
}

export async function postQuickmatchChat(
  sender: { userId: string; username: string; avatarUrl: string | null },
  text: string,
): Promise<QueueChatMessage> {
  const inQueue = await redis.zscore(MEMBERS_KEY, sender.userId)
  if (inQueue === null) throw new Error('NOT_IN_QUEUE')

  const trimmed = text.replace(/\s+$/g, '').slice(0, QUEUE_CHAT_MAX_LENGTH)
  if (!trimmed) throw new Error('EMPTY_MESSAGE')

  const message: QueueChatMessage = {
    id: randomUUID(),
    userId: sender.userId,
    username: sender.username,
    avatarUrl: sender.avatarUrl,
    text: censorProfanity(trimmed),
    sentAt: Date.now(),
  }

  await redis.rpush(CHAT_KEY, JSON.stringify(message))
  await redis.ltrim(CHAT_KEY, -CHAT_HISTORY_LIMIT, -1)
  await redis.expire(CHAT_KEY, CHAT_TTL_SEC)

  const ev: QueueEvent = { type: 'chat_message', message }
  await redis.publish(EVENTS_CHANNEL, JSON.stringify(ev))
  return message
}

export async function getQuickmatchChat(): Promise<QueueChatMessage[]> {
  const raw = await redis.lrange(CHAT_KEY, -CHAT_HISTORY_LIMIT, -1)
  return raw
    .map((j) => {
      try {
        return JSON.parse(j) as QueueChatMessage
      } catch {
        return null
      }
    })
    .filter((m): m is QueueChatMessage => !!m)
}

export async function quickmatchStatus(userId: string): Promise<QueueStatus> {
  const [score, count, ends, players] = await Promise.all([
    redis.zscore(MEMBERS_KEY, userId),
    redis.zcard(MEMBERS_KEY),
    redis.get(COUNTDOWN_KEY),
    listQueuePlayers(),
  ])
  return {
    inQueue: score !== null,
    count,
    countdownEnds: ends ? Number(ends) : null,
    players,
  }
}
