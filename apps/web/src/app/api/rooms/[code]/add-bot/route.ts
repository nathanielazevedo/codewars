import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { getRoom, joinRoom } from '@/lib/rooms'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const code = params.code.toUpperCase()
  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'ROOM_NOT_WAITING' }, { status: 409 })
  }

  const existingIds = new Set(room.players.map((p) => p.userId))
  const candidate = await db.user.findFirst({
    where: { isBot: true, id: { notIn: Array.from(existingIds) } },
    orderBy: { elo: 'asc' },
  })
  if (!candidate) {
    return NextResponse.json({ error: 'NO_BOTS_AVAILABLE' }, { status: 404 })
  }

  const updated = await joinRoom(code, {
    userId: candidate.id,
    username: candidate.username,
    elo: candidate.elo,
    avatarUrl: candidate.avatarUrl,
    joinedAt: Date.now(),
  })
  return NextResponse.json({ room: updated })
}
