import { db } from '@code-arena/db'
import {
  BOT_PROFILES,
  WEAPONS,
  type BotPersona,
  type PlayerGameState,
  type WeaponType,
} from '@code-arena/types'
import { redis, redisSub } from './redis.js'

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

type MatchEvent =
  | { type: 'player_progress'; userId: string; username: string; testsPassed: number; totalTests: number; finishedAt: number | null }
  | { type: 'player_finished'; userId: string; username: string; finishedAt: number }
  | { type: 'game_end'; placements: Placement[]; eloDeltas: Record<string, number> }
  | { type: 'weapon_used'; weaponType: WeaponType; attackerId: string; attackerUsername: string; targetId: string; duration: number }
  | { type: 'weapon_blocked'; weaponType: WeaponType; attackerId: string; attackerUsername: string; targetId: string }
  | { type: 'ap_update'; userId: string; ap: number }
  | { type: 'tick'; timeRemainingMs: number }

const MATCH_TTL_SEC = 60 * 60 * 2
const matchKey = (id: string) => `match:${id}`
const matchChannel = (id: string) => `match:${id}:events`

const activeMatches = new Set<string>()
const timers = new Map<string, NodeJS.Timeout[]>()

async function readMatch(id: string): Promise<Match | null> {
  const json = await redis.get(matchKey(id))
  return json ? (JSON.parse(json) as Match) : null
}

async function writeMatch(match: Match): Promise<void> {
  await redis.set(matchKey(match.id), JSON.stringify(match), 'EX', MATCH_TTL_SEC)
}

async function publishMatch(id: string, event: MatchEvent): Promise<void> {
  await redis.publish(matchChannel(id), JSON.stringify(event))
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pickTarget(match: Match, botId: string): string | null {
  const candidates = match.players
    .map((p) => p.userId)
    .filter((id) => {
      if (id === botId) return false
      const s = match.playerStates[id]
      return s && s.finishedAt === null
    })
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function trackTimer(matchId: string, handle: NodeJS.Timeout) {
  if (!timers.has(matchId)) timers.set(matchId, [])
  timers.get(matchId)!.push(handle)
}

function clearMatchTimers(matchId: string) {
  const list = timers.get(matchId)
  if (!list) return
  for (const t of list) clearTimeout(t)
  timers.delete(matchId)
}

async function recordBotProgress(
  matchId: string,
  botId: string,
  botUsername: string,
  delta: number,
): Promise<{ finished: boolean } | null> {
  const match = await readMatch(matchId)
  if (!match || match.status !== 'active') return null
  const state = match.playerStates[botId]
  if (!state) return null
  if (state.frozenUntil > Date.now()) return null
  if (state.finishedAt !== null) return { finished: true }

  const before = state.testsPassed
  state.testsPassed = Math.min(state.totalTests, state.testsPassed + delta)
  state.lastSubmitAt = Date.now()
  state.ap += (state.testsPassed - before) * 20
  const nowFinished = state.testsPassed >= state.totalTests && state.totalTests > 0
  if (nowFinished) {
    state.finishedAt = Date.now()
    state.ap += 60
  }

  await writeMatch(match)

  await publishMatch(matchId, {
    type: 'player_progress',
    userId: botId,
    username: botUsername,
    testsPassed: state.testsPassed,
    totalTests: state.totalTests,
    finishedAt: state.finishedAt,
  })
  await publishMatch(matchId, { type: 'ap_update', userId: botId, ap: state.ap })
  if (nowFinished) {
    await publishMatch(matchId, {
      type: 'player_finished',
      userId: botId,
      username: botUsername,
      finishedAt: state.finishedAt!,
    })
  }
  return { finished: nowFinished }
}

async function botUseWeapon(
  matchId: string,
  botId: string,
  botUsername: string,
  weaponType: WeaponType,
  targetId: string,
): Promise<boolean> {
  const weapon = WEAPONS[weaponType]
  if (!weapon) return false
  const match = await readMatch(matchId)
  if (!match || match.status !== 'active') return false
  const attackerState = match.playerStates[botId]
  const targetState = match.playerStates[targetId]
  if (!attackerState || !targetState) return false
  if (attackerState.ap < weapon.cost) return false
  if (attackerState.frozenUntil > Date.now()) return false
  const cooldownUntil = attackerState.cooldowns[weaponType] ?? 0
  if (cooldownUntil > Date.now()) return false
  if (weaponType === 'nuke' && attackerState.nukeUsed) return false

  attackerState.ap -= weapon.cost
  if (weapon.cooldownMs > 0) attackerState.cooldowns[weaponType] = Date.now() + weapon.cooldownMs

  if (targetState.shield) {
    targetState.shield = false
    await writeMatch(match)
    await publishMatch(matchId, { type: 'ap_update', userId: botId, ap: attackerState.ap })
    await publishMatch(matchId, {
      type: 'weapon_blocked',
      weaponType,
      attackerId: botId,
      attackerUsername: botUsername,
      targetId,
    })
    return true
  }

  switch (weaponType) {
    case 'freeze':
      targetState.frozen = true
      targetState.frozenUntil = Date.now() + weapon.durationMs
      break
    case 'mirage':
      targetState.mirage = true
      break
    case 'screen_lock':
    case 'shuffle':
    case 'code_bomb':
      // client-visible only
      break
  }

  await writeMatch(match)
  await publishMatch(matchId, { type: 'ap_update', userId: botId, ap: attackerState.ap })
  await publishMatch(matchId, {
    type: 'weapon_used',
    weaponType,
    attackerId: botId,
    attackerUsername: botUsername,
    targetId,
    duration: weapon.durationMs,
  })
  return true
}

function pickBotWeapon(persona: BotPersona): WeaponType {
  if (persona === 'ace') {
    const pool: WeaponType[] = ['freeze', 'freeze', 'mirage', 'code_bomb', 'screen_lock']
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const pool: WeaponType[] = ['freeze', 'mirage', 'code_bomb']
  return pool[Math.floor(Math.random() * pool.length)]
}

function scheduleBot(match: Match, bot: { userId: string; username: string; persona: BotPersona }) {
  const profile = BOT_PROFILES[bot.persona]
  const matchId = match.id
  const totalTests = match.playerStates[bot.userId]?.totalTests ?? 0
  if (totalTests === 0) return

  const solveTotalMs = randBetween(profile.solveDelayRange[0], profile.solveDelayRange[1])
  // How many of the tests this bot will ultimately pass (accuracy scales coverage)
  const plannedPasses = Math.max(
    0,
    Math.min(totalTests, Math.round(totalTests * (profile.accuracy + (Math.random() - 0.5) * 0.1))),
  )
  if (plannedPasses === 0) return

  // Spread the planned passes across solveTotalMs with some jitter per step
  for (let i = 1; i <= plannedPasses; i++) {
    const base = (solveTotalMs / plannedPasses) * i
    const jitter = randBetween(-1500, 1500)
    const fireIn = Math.max(500, base + jitter)
    const h = setTimeout(() => {
      if (!activeMatches.has(matchId)) return
      void recordBotProgress(matchId, bot.userId, bot.username, 1).then((r) => {
        if (r?.finished) scheduleCleanupCheck(matchId)
      })
    }, fireIn)
    trackTimer(matchId, h)
  }

  // Schedule weapon uses for non-rookies
  if (profile.weaponStrategy === 'none') return

  const firstFireIn = randBetween(profile.weaponUseRangeMs[0], profile.weaponUseRangeMs[1])
  const scheduleNextFire = (inMs: number) => {
    const h = setTimeout(async () => {
      if (!activeMatches.has(matchId)) return
      const current = await readMatch(matchId)
      if (!current || current.status !== 'active') return
      if (current.playerStates[bot.userId]?.finishedAt) return
      const target = pickTarget(current, bot.userId)
      if (target) {
        await botUseWeapon(matchId, bot.userId, bot.username, pickBotWeapon(bot.persona), target)
      }
      // Recurring fires with persona cadence
      const nextIn = randBetween(profile.weaponUseRangeMs[0], profile.weaponUseRangeMs[1])
      scheduleNextFire(nextIn)
    }, inMs)
    trackTimer(matchId, h)
  }
  scheduleNextFire(firstFireIn)
}

async function scheduleCleanupCheck(matchId: string) {
  // Small delay so final events flush before we drop the controller
  setTimeout(() => {
    readMatch(matchId).then((m) => {
      if (!m || m.status !== 'active') stopMatch(matchId)
    }).catch(() => {})
  }, 2000)
}

function stopMatch(matchId: string) {
  if (!activeMatches.has(matchId)) return
  activeMatches.delete(matchId)
  clearMatchTimers(matchId)
  console.log(`[bot-runner] stopped match ${matchId}`)
}

async function getBotPlayers(match: Match): Promise<Array<{ userId: string; username: string; persona: BotPersona }>> {
  const ids = match.players.map((p) => p.userId)
  if (!ids.length) return []
  const rows = await db.user.findMany({
    where: { id: { in: ids }, isBot: true },
    select: { id: true, username: true, botPersona: true },
  })
  return rows
    .filter((r) => r.botPersona === 'rookie' || r.botPersona === 'contender' || r.botPersona === 'ace')
    .map((r) => ({ userId: r.id, username: r.username, persona: r.botPersona as BotPersona }))
}

export async function onMatchStart(matchId: string): Promise<void> {
  if (activeMatches.has(matchId)) return
  const match = await readMatch(matchId)
  if (!match || match.status !== 'active') return
  const bots = await getBotPlayers(match)
  if (!bots.length) return

  activeMatches.add(matchId)
  console.log(`[bot-runner] driving match ${matchId} with ${bots.length} bot(s)`)
  for (const bot of bots) scheduleBot(match, bot)

  // Safety timeout: drop controller after 20 min regardless
  const timeout = setTimeout(() => stopMatch(matchId), 20 * 60 * 1000)
  trackTimer(matchId, timeout)
}

export function startBotRunner() {
  console.log('[bot-runner] starting')

  redisSub.on('message', (channel, message) => {
    if (channel !== 'queue:quickmatch:events') return
    try {
      const event = JSON.parse(message) as { type: string; matchId?: string }
      if (event.type === 'matched' && event.matchId) {
        void onMatchStart(event.matchId)
      }
    } catch {
      /* ignore */
    }
  })

  redisSub.on('pmessage', (_pattern, channel, message) => {
    const m = channel.match(/^room:([^:]+):events$/)
    if (!m) {
      const matchChan = channel.match(/^match:([^:]+):events$/)
      if (matchChan) {
        try {
          const event = JSON.parse(message) as MatchEvent
          if (event.type === 'game_end') stopMatch(matchChan[1])
        } catch {
          /* ignore */
        }
      }
      return
    }
    try {
      const event = JSON.parse(message) as { type: string; matchId?: string }
      if (event.type === 'game_start' && event.matchId) {
        // Rooms publish game_start at start — match record is created by web side first.
        // Small delay to let the web route write the match record to Redis.
        setTimeout(() => void onMatchStart(event.matchId!), 500)
      }
    } catch {
      /* ignore */
    }
  })
}
