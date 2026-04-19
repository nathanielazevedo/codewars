export type WeaponType =
  | 'freeze'
  | 'screen_lock'
  | 'shuffle'
  | 'mirage'
  | 'code_bomb'
  | 'shield'
  | 'time_warp'
  | 'nuke'

export interface WeaponConfig {
  cost: number
  durationMs: number
  cooldownMs: number
  description: string
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  freeze:      { cost: 80,  durationMs: 20000, cooldownMs: 60000,  description: 'Target cannot edit or submit for 20s' },
  screen_lock: { cost: 120, durationMs: 10000, cooldownMs: 90000,  description: "Target's editor goes dark for 10s" },
  shuffle:     { cost: 100, durationMs: 0,     cooldownMs: 45000,  description: "Scramble target's code lines" },
  mirage:      { cost: 90,  durationMs: 0,     cooldownMs: 60000,  description: "Target's next submit returns fake Wrong Answer" },
  code_bomb:   { cost: 70,  durationMs: 0,     cooldownMs: 30000,  description: 'Insert 5 random chars into target code' },
  shield:      { cost: 60,  durationMs: 0,     cooldownMs: 120000, description: 'Block the next incoming weapon' },
  time_warp:   { cost: 50,  durationMs: 0,     cooldownMs: 45000,  description: '+30s added to your timer' },
  nuke:        { cost: 300, durationMs: 15000, cooldownMs: 0,      description: 'Freeze ALL opponents for 15s (once per match)' },
}

export const INITIAL_AP = 200

export const QUICKMATCH = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 10,
  COUNTDOWN_MS: 30000,
} as const

export interface QueuedPlayer {
  userId: string
  username: string
  elo: number
  avatarUrl: string | null
  joinedAt: number
}

export interface QueueStatus {
  inQueue: boolean
  count: number
  countdownEnds: number | null
}

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master'

export type MatchStatus = 'waiting' | 'active' | 'finished' | 'cancelled'

export type SubmissionStatus =
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compile_error'

export interface PlayerGameState {
  ap: number
  shield: boolean
  frozen: boolean
  frozenUntil: number
  mirage: boolean
  cooldowns: Record<string, number>
  nukeUsed: boolean
}

export interface PlayerState {
  userId: string
  username: string
  score: number
  ap: number
  problemsSolved: number[]
  shield: boolean
  frozen: boolean
  frozenUntil: number
}

export interface ServerToClientEvents {
  'game:start': (payload: { problems: unknown[]; players: PlayerState[]; duration: number }) => void
  'game:tick': (payload: { timeRemaining: number }) => void
  'game:end': (payload: { leaderboard: PlayerState[]; eloDeltas: Record<string, number> }) => void
  'player:solved': (payload: { userId: string; problemIndex: number; timeTaken: number }) => void
  'player:score_update': (payload: { userId: string; score: number; ap: number }) => void
  'weapon:incoming': (payload: {
    weaponType: WeaponType
    attackerId: string
    attackerUsername: string
    targetId: string
    duration: number
  }) => void
  'weapon:effect_end': (payload: { weaponType: WeaponType }) => void
  'weapon:blocked': (payload: { weaponType: WeaponType; attackerId: string; targetId: string }) => void
  'weapon:self_used': (payload: { weaponType: WeaponType; userId: string }) => void
  'player:ap_update': (payload: { userId: string; ap: number }) => void
  'lobby:player_joined': (payload: { userId: string; username: string; elo: number }) => void
  'lobby:player_left': (payload: { userId: string }) => void
}

export interface ClientToServerEvents {
  'player:ready': () => void
  'weapon:use': (payload: { weaponType: WeaponType; targetId: string }) => void
  'editor:cursor': (payload: { line: number; column: number }) => void
}
