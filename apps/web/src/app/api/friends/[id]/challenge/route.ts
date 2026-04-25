import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { createRoom } from '@/lib/rooms'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const friendship = await db.friendship.findUnique({ where: { id } })
  if (!friendship || friendship.status !== 'accepted') {
    return NextResponse.json({ error: 'NOT_FRIENDS' }, { status: 404 })
  }
  if (friendship.requesterId !== session.user.id && friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: 'NOT_FRIENDS' }, { status: 404 })
  }

  const targetId =
    friendship.requesterId === session.user.id ? friendship.addresseeId : friendship.requesterId

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true },
  })
  if (!target) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

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

  await redis.publish(
    `user:${target.id}:events`,
    JSON.stringify({
      type: 'challenge',
      fromId: me.id,
      fromUsername: me.username,
      roomCode: room.code,
      sentAt: Date.now(),
    }),
  )

  return NextResponse.json({ room })
}
