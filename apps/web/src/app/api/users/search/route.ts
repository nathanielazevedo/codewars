import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 1) return NextResponse.json({ results: [] })
  if (q.length > 32) return NextResponse.json({ error: 'QUERY_TOO_LONG' }, { status: 400 })

  const me = session.user.id

  const users = await db.user.findMany({
    where: {
      AND: [
        { id: { not: me } },
        { username: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      elo: true,
      rankTier: true,
      isBot: true,
    },
    orderBy: [{ elo: 'desc' }],
    take: 20,
  })

  const ids = users.map((u) => u.id)
  const friendships = ids.length
    ? await db.friendship.findMany({
        where: {
          OR: [
            { requesterId: me, addresseeId: { in: ids } },
            { addresseeId: me, requesterId: { in: ids } },
          ],
        },
      })
    : []

  const relByUser = new Map<string, 'friends' | 'incoming' | 'outgoing' | 'none'>()
  for (const f of friendships) {
    const other = f.requesterId === me ? f.addresseeId : f.requesterId
    if (f.status === 'accepted') relByUser.set(other, 'friends')
    else if (f.status === 'pending') {
      relByUser.set(other, f.requesterId === me ? 'outgoing' : 'incoming')
    }
  }

  const lowerQ = q.toLowerCase()
  const ranked = users
    .map((u) => {
      const name = u.username.toLowerCase()
      const prefixScore = name.startsWith(lowerQ) ? 0 : 1
      const exactScore = name === lowerQ ? -1 : 0
      return { u, sort: exactScore * 10 + prefixScore }
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ u }) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      elo: u.elo,
      rankTier: u.rankTier,
      isBot: u.isBot,
      relationship: relByUser.get(u.id) ?? 'none',
    }))

  return NextResponse.json({ results: ranked.slice(0, 12) })
}
