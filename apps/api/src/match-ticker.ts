import type { PlayerGameState } from '@code-arena/types'
import { db } from '@code-arena/db'
import { redis } from './redis.js'

type MatchPlayer = {
  userId: string
  username: string
  elo: number
  avatarUrl: string | null
  joinedAt: number
}

type Placement = {
  userId: string
  placement: number
  testsPassed: number
  finishedAt: number | null
}

type Match = {
  id: string
  roomCode: string
  problemId: string
  players: MatchPlayer[]
  status: 'active' | 'finished'
  startedAt: number
  endsAt: number
  endedAt: number | null
  playerStates: Record<string, PlayerGameState>
  placements: Placement[]
}

const MATCH_TTL_SEC = 60 * 60 * 2
const TICK_MS = 1000
const SCAN_BATCH = 50

const matchKey = (id: string) => `match:${id}`
const matchChannel = (id: string) => `match:${id}:events`

async function readMatch(id: string): Promise<Match | null> {
  const json = await redis.get(matchKey(id))
  return json ? (JSON.parse(json) as Match) : null
}

async function writeMatch(match: Match): Promise<void> {
  await redis.set(matchKey(match.id), JSON.stringify(match), 'EX', MATCH_TTL_SEC)
}

async function publishEvent(id: string, event: unknown): Promise<void> {
  await redis.publish(matchChannel(id), JSON.stringify(event))
}

function rankPlayers(match: Match): Placement[] {
  const entries = Object.entries(match.playerStates)
  entries.sort((a, b) => {
    const sa = a[1]
    const sb = b[1]
    if (sa.finishedAt !== null && sb.finishedAt !== null) return sa.finishedAt - sb.finishedAt
    if (sa.finishedAt !== null) return -1
    if (sb.finishedAt !== null) return 1
    if (sb.testsPassed !== sa.testsPassed) return sb.testsPassed - sa.testsPassed
    const la = sa.lastSubmitAt || Number.MAX_SAFE_INTEGER
    const lb = sb.lastSubmitAt || Number.MAX_SAFE_INTEGER
    return la - lb
  })
  return entries.map(([userId, s], idx) => ({
    userId,
    placement: idx + 1,
    testsPassed: s.testsPassed,
    finishedAt: s.finishedAt,
  }))
}

const XP_PARTICIPATION = 10
const XP_SOLVED = 50
const XP_BY_PLACEMENT: Record<number, number> = { 1: 50, 2: 25, 3: 10 }

function computeXpDeltas(match: Match, placements: Placement[]): Record<string, number> {
  const deltas: Record<string, number> = {}
  for (const p of placements) {
    const state = match.playerStates[p.userId]
    let xp = XP_PARTICIPATION
    if (state?.finishedAt !== null) xp += XP_SOLVED
    xp += XP_BY_PLACEMENT[p.placement] ?? 0
    deltas[p.userId] = xp
  }
  return deltas
}

function computeEloDeltas(match: Match, placements: Placement[]): Record<string, number> {
  const n = placements.length
  if (n <= 1) return Object.fromEntries(placements.map((p) => [p.userId, 0]))

  const eloByUser = new Map(match.players.map((p) => [p.userId, p.elo]))
  const K = 24
  const deltas: Record<string, number> = {}

  for (const me of placements) {
    const myElo = eloByUser.get(me.userId) ?? 1200
    let total = 0
    for (const opp of placements) {
      if (opp.userId === me.userId) continue
      const oppElo = eloByUser.get(opp.userId) ?? 1200
      const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400))
      const actual = me.placement < opp.placement ? 1 : me.placement > opp.placement ? 0 : 0.5
      total += K * (actual - expected)
    }
    deltas[me.userId] = Math.round(total / (n - 1))
  }
  return deltas
}

async function finalize(matchId: string): Promise<void> {
  const lockKey = `match:${matchId}:finalize_lock`
  const got = await redis.set(lockKey, '1', 'EX', 10, 'NX')
  if (got !== 'OK') return

  try {
    const match = await readMatch(matchId)
    if (!match || match.status !== 'active') return

    const placements = rankPlayers(match)
    for (const p of placements) {
      const s = match.playerStates[p.userId]
      if (s) s.placement = p.placement
    }
    const eloDeltas = computeEloDeltas(match, placements)
    const xpDeltas = computeXpDeltas(match, placements)

    match.placements = placements
    match.status = 'finished'
    match.endedAt = Date.now()
    await writeMatch(match)

    for (const userId of new Set([...Object.keys(eloDeltas), ...Object.keys(xpDeltas)])) {
      const eloDelta = eloDeltas[userId] ?? 0
      const xpDelta = xpDeltas[userId] ?? 0
      if (!eloDelta && !xpDelta) continue
      try {
        await db.user.update({
          where: { id: userId },
          data: {
            ...(eloDelta ? { elo: { increment: eloDelta } } : {}),
            ...(xpDelta ? { xp: { increment: xpDelta } } : {}),
          },
        })
      } catch {
        /* bot or missing row */
      }
    }

    await publishEvent(matchId, { type: 'game_end', placements, eloDeltas, xpDeltas })
    console.log(`[match-ticker] finalized ${matchId}`)
  } finally {
    await redis.del(lockKey)
  }
}

async function scanActiveMatches(): Promise<string[]> {
  const ids: string[] = []
  let cursor = '0'
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'match:*', 'COUNT', SCAN_BATCH)
    cursor = next
    for (const k of keys) {
      if (k.includes(':')) {
        const parts = k.split(':')
        // key shape "match:<uuid>" — length 2; skip sub-keys like match:<id>:events or locks
        if (parts.length === 2) ids.push(parts[1])
      }
    }
  } while (cursor !== '0')
  return ids
}

async function tick(): Promise<void> {
  const now = Date.now()
  const ids = await scanActiveMatches()
  for (const id of ids) {
    const match = await readMatch(id)
    if (!match || match.status !== 'active') continue

    const remaining = Math.max(0, match.endsAt - now)
    // Emit a 1hz countdown
    await publishEvent(id, { type: 'tick', timeRemainingMs: remaining })

    const allFinished = Object.values(match.playerStates).every((s) => s.finishedAt !== null)
    if (remaining === 0 || allFinished) {
      await finalize(id)
    }
  }
}

export function startMatchTicker() {
  console.log('[match-ticker] starting')
  const handle = setInterval(() => {
    tick().catch((err) => console.error('[match-ticker] error:', err))
  }, TICK_MS)
  return () => clearInterval(handle)
}
