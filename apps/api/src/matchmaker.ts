import { randomUUID } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import { db } from '@code-arena/db'
import { INITIAL_AP, QUICKMATCH, type PlayerGameState, type QueuedPlayer } from '@code-arena/types'
import { redis } from './redis.js'

const MEMBERS_KEY = 'queue:quickmatch:members'
const PLAYERS_KEY = 'queue:quickmatch:players'
const COUNTDOWN_KEY = 'queue:quickmatch:countdown'
const LOCK_KEY = 'queue:quickmatch:lock'
const EVENTS_CHANNEL = 'queue:quickmatch:events'
const TICK_MS = 1000
const MATCH_TTL_SEC = 60 * 60 * 2

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genCode = customAlphabet(CODE_ALPHABET, 6)

type MatchPlayer = QueuedPlayer
type Match = {
  id: string
  roomCode: string
  problemId: string
  players: MatchPlayer[]
  solvers: string[]
  winnerId: string | null
  status: 'active' | 'finished'
  startedAt: number
  endedAt: number | null
  playerStates: Record<string, PlayerGameState>
  isPublic?: boolean
}

async function pickProblemId(): Promise<string | null> {
  const count = await db.problem.count()
  if (count === 0) return null
  const skip = Math.floor(Math.random() * count)
  const row = await db.problem.findFirst({ skip, select: { id: true } })
  return row?.id ?? null
}

async function publishUpdate(): Promise<void> {
  const count = await redis.zcard(MEMBERS_KEY)
  const ends = await redis.get(COUNTDOWN_KEY)
  await redis.publish(
    EVENTS_CHANNEL,
    JSON.stringify({ type: 'update', count, countdownEnds: ends ? Number(ends) : null }),
  )
}

async function popPlayers(max: number): Promise<MatchPlayer[]> {
  // Get up to `max` earliest joiners
  const userIds = await redis.zrange(MEMBERS_KEY, 0, max - 1)
  if (userIds.length === 0) return []

  const rows = await redis.hmget(PLAYERS_KEY, ...userIds)
  const players: MatchPlayer[] = []
  for (const row of rows) {
    if (!row) continue
    try {
      players.push(JSON.parse(row) as MatchPlayer)
    } catch {
      /* skip corrupt entry */
    }
  }

  // Remove from queue atomically-ish
  if (userIds.length) {
    await redis.zrem(MEMBERS_KEY, ...userIds)
    await redis.hdel(PLAYERS_KEY, ...userIds)
  }
  return players
}

async function createPublicMatch(players: MatchPlayer[]): Promise<Match | null> {
  const problemId = await pickProblemId()
  if (!problemId) return null

  const playerStates: Record<string, PlayerGameState> = {}
  for (const p of players) {
    playerStates[p.userId] = {
      ap: INITIAL_AP,
      shield: false,
      frozen: false,
      frozenUntil: 0,
      mirage: false,
      cooldowns: {},
      nukeUsed: false,
    }
  }

  const match: Match = {
    id: randomUUID(),
    roomCode: `QM-${genCode().slice(0, 4)}`,
    problemId,
    players,
    solvers: [],
    winnerId: null,
    status: 'active',
    startedAt: Date.now(),
    endedAt: null,
    playerStates,
    isPublic: true,
  }

  await redis.set(`match:${match.id}`, JSON.stringify(match), 'EX', MATCH_TTL_SEC)
  return match
}

async function queueHasAdmin(): Promise<boolean> {
  const all = await redis.hvals(PLAYERS_KEY)
  return all.some((row) => {
    try {
      return (JSON.parse(row) as MatchPlayer).isAdmin === true
    } catch {
      return false
    }
  })
}

async function tick(): Promise<void> {
  const count = await redis.zcard(MEMBERS_KEY)
  if (count < 1) return

  const hasAdmin = await queueHasAdmin()
  const effectiveMin = hasAdmin ? 1 : QUICKMATCH.MIN_PLAYERS
  if (count < effectiveMin) return

  const endsRaw = await redis.get(COUNTDOWN_KEY)
  const now = Date.now()
  const readyByFill = count >= QUICKMATCH.MAX_PLAYERS
  const readyByTimer = endsRaw !== null && now >= Number(endsRaw)

  if (!readyByFill && !readyByTimer) return

  // Lock to prevent double-fire across ticks
  const got = await redis.set(LOCK_KEY, '1', 'EX', 5, 'NX')
  if (got !== 'OK') return

  try {
    const players = await popPlayers(QUICKMATCH.MAX_PLAYERS)
    if (players.length < effectiveMin) {
      // Return the lonely player(s) to the queue if we somehow didn't clear enough
      for (const p of players) {
        await redis.zadd(MEMBERS_KEY, p.joinedAt, p.userId)
        await redis.hset(PLAYERS_KEY, p.userId, JSON.stringify(p))
      }
      return
    }

    await redis.del(COUNTDOWN_KEY)

    const match = await createPublicMatch(players)
    if (!match) {
      console.error('[matchmaker] no problems available; returning players to queue')
      for (const p of players) {
        await redis.zadd(MEMBERS_KEY, p.joinedAt, p.userId)
        await redis.hset(PLAYERS_KEY, p.userId, JSON.stringify(p))
      }
      return
    }

    await redis.publish(
      EVENTS_CHANNEL,
      JSON.stringify({
        type: 'matched',
        matchId: match.id,
        userIds: players.map((p) => p.userId),
      }),
    )
    console.log(
      `[matchmaker] fired match ${match.id} with ${players.length} players (problem ${match.problemId})`,
    )

    await publishUpdate()

    // If queue still has ≥ MIN_PLAYERS after pop (rare — only if >10 in queue), restart countdown
    const remaining = await redis.zcard(MEMBERS_KEY)
    if (remaining >= QUICKMATCH.MIN_PLAYERS) {
      const nextEnds = Date.now() + QUICKMATCH.COUNTDOWN_MS
      await redis.set(COUNTDOWN_KEY, String(nextEnds), 'PX', QUICKMATCH.COUNTDOWN_MS + 30000)
      await publishUpdate()
    }
  } finally {
    await redis.del(LOCK_KEY)
  }
}

export function startMatchmaker() {
  console.log('[matchmaker] starting quickmatch tick loop')
  const interval = setInterval(() => {
    tick().catch((err) => console.error('[matchmaker] tick error:', err))
  }, TICK_MS)
  return () => clearInterval(interval)
}
