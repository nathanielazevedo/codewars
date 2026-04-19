import { QUICKMATCH, type QueuedPlayer, type QueueStatus } from '@code-arena/types'
import { redis } from './redis'

const MEMBERS_KEY = 'queue:quickmatch:members'
const PLAYERS_KEY = 'queue:quickmatch:players'
const COUNTDOWN_KEY = 'queue:quickmatch:countdown'
const EVENTS_CHANNEL = 'queue:quickmatch:events'

type QueueEvent =
  | { type: 'update'; count: number; countdownEnds: number | null }
  | { type: 'matched'; matchId: string; userIds: string[] }

async function publishUpdate(): Promise<{ count: number; countdownEnds: number | null }> {
  const count = await redis.zcard(MEMBERS_KEY)
  const ends = await redis.get(COUNTDOWN_KEY)
  const countdownEnds = ends ? Number(ends) : null
  const ev: QueueEvent = { type: 'update', count, countdownEnds }
  await redis.publish(EVENTS_CHANNEL, JSON.stringify(ev))
  return { count, countdownEnds }
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

  // Start countdown when we reach MIN_PLAYERS and no countdown is running
  if (count >= QUICKMATCH.MIN_PLAYERS && count < QUICKMATCH.MAX_PLAYERS) {
    const existingEnds = await redis.get(COUNTDOWN_KEY)
    if (!existingEnds) {
      const ends = Date.now() + QUICKMATCH.COUNTDOWN_MS
      // Give it a generous TTL so stale state doesn't linger forever
      await redis.set(COUNTDOWN_KEY, String(ends), 'PX', QUICKMATCH.COUNTDOWN_MS + 30000)
    }
  }

  const { count: newCount, countdownEnds } = await publishUpdate()
  return { inQueue: true, count: newCount, countdownEnds }
}

export async function leaveQuickmatch(userId: string): Promise<QueueStatus> {
  const removed = await redis.zrem(MEMBERS_KEY, userId)
  if (removed) await redis.hdel(PLAYERS_KEY, userId)

  const count = await redis.zcard(MEMBERS_KEY)
  if (count < QUICKMATCH.MIN_PLAYERS) {
    await redis.del(COUNTDOWN_KEY)
  }

  const { count: newCount, countdownEnds } = await publishUpdate()
  return { inQueue: false, count: newCount, countdownEnds }
}

export async function quickmatchStatus(userId: string): Promise<QueueStatus> {
  const [score, count, ends] = await Promise.all([
    redis.zscore(MEMBERS_KEY, userId),
    redis.zcard(MEMBERS_KEY),
    redis.get(COUNTDOWN_KEY),
  ])
  return {
    inQueue: score !== null,
    count,
    countdownEnds: ends ? Number(ends) : null,
  }
}
