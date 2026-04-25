import { redis } from './redis'

const ONLINE_SET = 'presence:online'
const IN_MATCH_HASH = 'presence:in_match'

export type PresenceStatus = {
  online: boolean
  matchId: string | null
}

export async function getPresence(userIds: string[]): Promise<Record<string, PresenceStatus>> {
  if (!userIds.length) return {}

  const uniq = Array.from(new Set(userIds))
  const [online, matches] = await Promise.all([
    Promise.all(uniq.map((id) => redis.sismember(ONLINE_SET, id))),
    redis.hmget(IN_MATCH_HASH, ...uniq),
  ])

  const out: Record<string, PresenceStatus> = {}
  uniq.forEach((id, i) => {
    out[id] = {
      online: online[i] === 1,
      matchId: matches[i] ?? null,
    }
  })
  return out
}
