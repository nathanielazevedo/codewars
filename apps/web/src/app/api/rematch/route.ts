import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { createRoom } from '@/lib/rooms'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { opponentIds } = await req.json().catch(() => ({}))
  if (!Array.isArray(opponentIds)) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const uniqOpponentIds = Array.from(new Set(opponentIds)).filter(
    (id) => typeof id === 'string' && id !== session.user.id,
  )

  const opponents = uniqOpponentIds.length
    ? await db.user.findMany({
        where: { id: { in: uniqOpponentIds }, isBot: false },
        select: { id: true },
      })
    : []

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, elo: true, avatarUrl: true },
  })
  if (!me) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const room = await createRoom({
    userId: me.id,
    username: me.username,
    elo: me.elo,
    avatarUrl: me.avatarUrl,
    joinedAt: Date.now(),
  })

  const sentAt = Date.now()
  await Promise.all(
    opponents.map((o) =>
      redis.publish(
        `user:${o.id}:events`,
        JSON.stringify({
          type: 'invite',
          fromId: me.id,
          fromUsername: me.username,
          roomCode: room.code,
          sentAt,
        }),
      ),
    ),
  )

  return NextResponse.json({ room, invited: opponents.map((o) => o.id) })
}
