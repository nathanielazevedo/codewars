import { db } from '@code-arena/db'

export type H2H = {
  wins: number
  losses: number
  matches: number
  lastMatchAt: Date | null
}

export type Rival = {
  userId: string
  username: string
  avatarUrl: string | null
  elo: number
  rankTier: string
  wins: number
  losses: number
  matches: number
  lastMatchAt: Date
}

export async function getH2H(userId: string, opponentId: string): Promise<H2H> {
  if (userId === opponentId) {
    return { wins: 0, losses: 0, matches: 0, lastMatchAt: null }
  }

  const rows = await db.$queryRaw<
    Array<{ match_id: string; me_place: number | null; them_place: number | null; ended_at: Date | null }>
  >`
    SELECT
      me.match_id,
      me.placement AS me_place,
      them.placement AS them_place,
      m.ended_at
    FROM match_players me
    JOIN match_players them
      ON them.match_id = me.match_id AND them.user_id = ${opponentId}
    JOIN matches m ON m.id = me.match_id
    WHERE me.user_id = ${userId}
      AND m.status = 'finished'
      AND me.placement IS NOT NULL
      AND them.placement IS NOT NULL
  `

  let wins = 0
  let losses = 0
  let lastMatchAt: Date | null = null
  for (const r of rows) {
    if (r.me_place == null || r.them_place == null) continue
    if (r.me_place < r.them_place) wins += 1
    else if (r.me_place > r.them_place) losses += 1
    if (r.ended_at && (!lastMatchAt || r.ended_at > lastMatchAt)) {
      lastMatchAt = r.ended_at
    }
  }

  return { wins, losses, matches: rows.length, lastMatchAt }
}

export async function getH2HBulk(
  userId: string,
  opponentIds: string[],
): Promise<Record<string, H2H>> {
  const out: Record<string, H2H> = {}
  const ids = opponentIds.filter((id) => id !== userId)
  if (!ids.length) return out

  const rows = await db.$queryRaw<
    Array<{
      opponent_id: string
      me_place: number | null
      them_place: number | null
      ended_at: Date | null
    }>
  >`
    SELECT
      them.user_id AS opponent_id,
      me.placement AS me_place,
      them.placement AS them_place,
      m.ended_at
    FROM match_players me
    JOIN match_players them
      ON them.match_id = me.match_id AND them.user_id = ANY(${ids}::uuid[])
    JOIN matches m ON m.id = me.match_id
    WHERE me.user_id = ${userId}::uuid
      AND m.status = 'finished'
      AND me.placement IS NOT NULL
      AND them.placement IS NOT NULL
  `

  for (const id of ids) {
    out[id] = { wins: 0, losses: 0, matches: 0, lastMatchAt: null }
  }
  for (const r of rows) {
    if (r.me_place == null || r.them_place == null) continue
    const bucket = out[r.opponent_id]
    if (!bucket) continue
    bucket.matches += 1
    if (r.me_place < r.them_place) bucket.wins += 1
    else if (r.me_place > r.them_place) bucket.losses += 1
    if (r.ended_at && (!bucket.lastMatchAt || r.ended_at > bucket.lastMatchAt)) {
      bucket.lastMatchAt = r.ended_at
    }
  }

  return out
}

export async function getTopRivals(userId: string, limit = 5): Promise<Rival[]> {
  const rows = await db.$queryRaw<
    Array<{
      opponent_id: string
      wins: bigint
      losses: bigint
      matches: bigint
      last_match_at: Date
      username: string
      avatar_url: string | null
      elo: number
      rank_tier: string
    }>
  >`
    WITH pairs AS (
      SELECT
        them.user_id AS opponent_id,
        me.placement AS me_place,
        them.placement AS them_place,
        m.ended_at
      FROM match_players me
      JOIN match_players them
        ON them.match_id = me.match_id AND them.user_id <> me.user_id
      JOIN matches m ON m.id = me.match_id
      WHERE me.user_id = ${userId}::uuid
        AND m.status = 'finished'
        AND me.placement IS NOT NULL
        AND them.placement IS NOT NULL
    )
    SELECT
      p.opponent_id,
      COUNT(*) FILTER (WHERE p.me_place < p.them_place) AS wins,
      COUNT(*) FILTER (WHERE p.me_place > p.them_place) AS losses,
      COUNT(*) AS matches,
      MAX(p.ended_at) AS last_match_at,
      u.username,
      u.avatar_url,
      u.elo,
      u.rank_tier
    FROM pairs p
    JOIN users u ON u.id = p.opponent_id
    GROUP BY p.opponent_id, u.username, u.avatar_url, u.elo, u.rank_tier
    ORDER BY matches DESC, last_match_at DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    userId: r.opponent_id,
    username: r.username,
    avatarUrl: r.avatar_url,
    elo: r.elo,
    rankTier: r.rank_tier,
    wins: Number(r.wins),
    losses: Number(r.losses),
    matches: Number(r.matches),
    lastMatchAt: r.last_match_at,
  }))
}
