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
  solvers: string[]
  winnerId: string | null
  status: MatchStatus
  startedAt: number
  endedAt: number | null
  playerStates: Record<string, PlayerGameState>
}

export type MatchEvent =
  | { type: 'player_solved'; userId: string; username: string }
  | { type: 'game_end'; winnerId: string; winnerUsername: string }
  | { type: 'weapon_used'; weaponType: WeaponType; attackerId: string; attackerUsername: string; targetId: string; duration: number }
  | { type: 'weapon_blocked'; weaponType: WeaponType; attackerId: string; attackerUsername: string; targetId: string }
  | { type: 'ap_update'; userId: string; ap: number }

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
    }
  }

  const match: Match = {
    id: params.id,
    roomCode: params.roomCode,
    problemId: params.problemId,
    players: params.players,
    solvers: [],
    winnerId: null,
    status: 'active',
    startedAt: Date.now(),
    endedAt: null,
    playerStates,
  }
  await writeMatch(match)
  return match
}

export async function getMatch(id: string): Promise<Match | null> {
  return readMatch(id)
}

export async function recordSolve(
  matchId: string,
  userId: string,
  username: string,
): Promise<{ isFirstSolve: boolean; isWinner: boolean; match: Match | null }> {
  const match = await readMatch(matchId)
  if (!match) return { isFirstSolve: false, isWinner: false, match: null }
  if (match.status !== 'active') return { isFirstSolve: false, isWinner: false, match }
  if (match.solvers.includes(userId)) return { isFirstSolve: false, isWinner: false, match }

  match.solvers.push(userId)
  const isFirstSolve = match.solvers.length === 1

  // Award AP: 80 base + 20 for first solve
  const apEarned = 80 + (isFirstSolve ? 20 : 0)
  const ps = match.playerStates[userId]
  if (ps) {
    ps.ap += apEarned
    await publishEvent(matchId, { type: 'ap_update', userId, ap: ps.ap })
  }

  if (isFirstSolve) {
    match.winnerId = userId
    match.status = 'finished'
    match.endedAt = Date.now()
  }

  await writeMatch(match)
  await publishEvent(matchId, { type: 'player_solved', userId, username })
  if (isFirstSolve) {
    await publishEvent(matchId, { type: 'game_end', winnerId: userId, winnerUsername: username })
  }

  return { isFirstSolve, isWinner: isFirstSolve, match }
}
