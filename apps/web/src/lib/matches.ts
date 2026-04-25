import { redis } from './redis'
import type { RoomPlayer } from './rooms'
import { INITIAL_AP, type PlayerGameState, type WeaponType } from '@code-arena/types'

const MATCH_TTL_SEC = 60 * 60 * 2

export type MatchStatus = 'active' | 'finished'

export type Match = {
  id: string
  roomCode: string
  problemId: string
  players: RoomPlayer[]
  status: MatchStatus
  startedAt: number
  endsAt: number
  endedAt: number | null
  playerStates: Record<string, PlayerGameState>
  placements: Array<{ userId: string; placement: number; testsPassed: number; finishedAt: number | null }>
}

export type MatchEvent =
  | { type: 'player_progress'; userId: string; username: string; testsPassed: number; totalTests: number; finishedAt: number | null }
  | { type: 'player_finished'; userId: string; username: string; finishedAt: number }
  | { type: 'game_end'; placements: Match['placements']; eloDeltas: Record<string, number> }
  | { type: 'weapon_used'; weaponType: WeaponType; attackerId: string; attackerUsername: string; targetId: string; duration: number }
  | { type: 'weapon_blocked'; weaponType: WeaponType; attackerId: string; attackerUsername: string; targetId: string }
  | { type: 'ap_update'; userId: string; ap: number }
  | { type: 'tick'; timeRemainingMs: number }

const matchKey = (id: string) => `match:${id}`
const matchChannel = (id: string) => `match:${id}:events`

export async function readMatch(id: string): Promise<Match | null> {
  const json = await redis.get(matchKey(id))
  return json ? (JSON.parse(json) as Match) : null
}

export async function writeMatch(match: Match): Promise<void> {
  await redis.set(matchKey(match.id), JSON.stringify(match), 'EX', MATCH_TTL_SEC)
}

export async function publishEvent(id: string, event: MatchEvent): Promise<void> {
  await redis.publish(matchChannel(id), JSON.stringify(event))
}

export async function createMatch(params: {
  id: string
  roomCode: string
  problemId: string
  players: RoomPlayer[]
  totalTests: number
  durationSec: number
}): Promise<Match> {
  const playerStates: Record<string, PlayerGameState> = {}
  for (const p of params.players) {
    playerStates[p.userId] = {
      ap: INITIAL_AP,
      shield: false,
      frozen: false,
      frozenUntil: 0,
      mirage: false,
      cooldowns: {},
      nukeUsed: false,
      testsPassed: 0,
      totalTests: params.totalTests,
      lastSubmitAt: 0,
      finishedAt: null,
      placement: null,
    }
  }

  const now = Date.now()
  const match: Match = {
    id: params.id,
    roomCode: params.roomCode,
    problemId: params.problemId,
    players: params.players,
    status: 'active',
    startedAt: now,
    endsAt: now + params.durationSec * 1000,
    endedAt: null,
    playerStates,
    placements: [],
  }
  await writeMatch(match)
  return match
}

export async function getMatch(id: string): Promise<Match | null> {
  return readMatch(id)
}

export async function recordProgress(
  matchId: string,
  userId: string,
  username: string,
  testsPassed: number,
  totalTests: number,
): Promise<{ match: Match | null; improved: boolean; finished: boolean }> {
  const match = await readMatch(matchId)
  if (!match) return { match: null, improved: false, finished: false }
  if (match.status !== 'active') return { match, improved: false, finished: false }

  const state = match.playerStates[userId]
  if (!state) return { match, improved: false, finished: false }

  state.lastSubmitAt = Date.now()
  const now = Date.now()
  let improved = false

  if (testsPassed > state.testsPassed) {
    const prev = state.testsPassed
    state.testsPassed = testsPassed
    state.totalTests = totalTests
    improved = true

    // Award AP on each new test passed (small bump)
    const bonus = (testsPassed - prev) * 20
    state.ap += bonus

    if (testsPassed >= totalTests && state.finishedAt === null) {
      state.finishedAt = now
      // Finishing bonus AP
      state.ap += 60
    }
  }

  await writeMatch(match)

  await publishEvent(matchId, {
    type: 'player_progress',
    userId,
    username,
    testsPassed: state.testsPassed,
    totalTests: state.totalTests,
    finishedAt: state.finishedAt,
  })
  if (improved) {
    await publishEvent(matchId, { type: 'ap_update', userId, ap: state.ap })
  }
  if (state.finishedAt === now) {
    await publishEvent(matchId, {
      type: 'player_finished',
      userId,
      username,
      finishedAt: now,
    })
  }

  // End if all players have finished
  const allFinished = Object.values(match.playerStates).every((s) => s.finishedAt !== null)
  if (allFinished) {
    await finalizeMatch(matchId)
  }

  return { match, improved, finished: state.finishedAt !== null }
}

function rankPlayers(match: Match): Match['placements'] {
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

function computeEloDeltas(match: Match, placements: Match['placements']): Record<string, number> {
  const n = placements.length
  if (n <= 1) return Object.fromEntries(placements.map((p) => [p.userId, 0]))

  const eloByUser = new Map(match.players.map((p) => [p.userId, p.elo]))
  const K = 24
  const deltas: Record<string, number> = {}

  for (const me of placements) {
    const myElo = eloByUser.get(me.userId) ?? 1200
    let totalDelta = 0
    for (const opp of placements) {
      if (opp.userId === me.userId) continue
      const oppElo = eloByUser.get(opp.userId) ?? 1200
      const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400))
      // actual: 1 if I placed better, 0 if worse, 0.5 if same placement (unlikely)
      const actual = me.placement < opp.placement ? 1 : me.placement > opp.placement ? 0 : 0.5
      totalDelta += K * (actual - expected)
    }
    deltas[me.userId] = Math.round(totalDelta / (n - 1))
  }
  return deltas
}

export async function finalizeMatch(matchId: string): Promise<Match | null> {
  const match = await readMatch(matchId)
  if (!match) return null
  if (match.status !== 'active') return match

  const placements = rankPlayers(match)
  for (const p of placements) {
    const state = match.playerStates[p.userId]
    if (state) state.placement = p.placement
  }
  const eloDeltas = computeEloDeltas(match, placements)

  match.placements = placements
  match.status = 'finished'
  match.endedAt = Date.now()
  await writeMatch(match)

  // Best-effort: persist ELO deltas to DB for non-bot users
  const { db } = await import('@code-arena/db')
  for (const [userId, delta] of Object.entries(eloDeltas)) {
    if (!delta) continue
    try {
      await db.user.update({
        where: { id: userId },
        data: { elo: { increment: delta } },
      })
    } catch {
      /* ignore; bot users may have been removed or ID doesn't match a real row */
    }
  }

  await publishEvent(matchId, { type: 'game_end', placements, eloDeltas })
  return match
}
