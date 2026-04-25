import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { getRoom } from '@/lib/rooms'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { code } = await params
  const { targetId } = await req.json().catch(() => ({}))
  if (!targetId || typeof targetId !== 'string') {
    return NextResponse.json({ error: 'MISSING_TARGET' }, { status: 400 })
  }

  const room = await getRoom(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'ROOM_NOT_WAITING' }, { status: 409 })
  }
  if (!room.players.some((p) => p.userId === session.user.id)) {
    return NextResponse.json({ error: 'NOT_IN_ROOM' }, { status: 403 })
  }
  if (targetId === session.user.id) {
    return NextResponse.json({ error: 'CANNOT_INVITE_SELF' }, { status: 400 })
  }
  if (room.players.some((p) => p.userId === targetId)) {
    return NextResponse.json({ error: 'ALREADY_IN_ROOM' }, { status: 409 })
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, isBot: true },
  })
  if (!target || target.isBot) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  await redis.publish(
    `user:${target.id}:events`,
    JSON.stringify({
      type: 'invite',
      fromId: session.user.id,
      fromUsername: session.user.username,
      roomCode: room.code,
      sentAt: Date.now(),
    }),
  )

  return NextResponse.json({ ok: true })
}
