import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// GET /api/leaderboard — top players by elo
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)
  const offset = Number(url.searchParams.get('offset') ?? 0)

  const users = await db.user.findMany({
    orderBy: { elo: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      elo: true,
      xp: true,
      rankTier: true,
      _count: {
        select: { matchPlayers: true },
      },
    },
  })

  const total = await db.user.count()

  return NextResponse.json({
    users: users.map((u, i) => ({
      rank: offset + i + 1,
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      elo: u.elo,
      xp: u.xp,
      rankTier: u.rankTier,
      matchesPlayed: u._count.matchPlayers,
    })),
    total,
  })
}
