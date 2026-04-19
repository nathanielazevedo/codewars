import { auth } from '@/auth'
import { joinRoom } from '@/lib/rooms'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  try {
    const room = await joinRoom(params.code.toUpperCase(), {
      userId: session.user.id,
      username: session.user.username,
      elo: session.user.elo,
      avatarUrl: session.user.image ?? null,
      joinedAt: Date.now(),
    })
    return NextResponse.json({ room })
  } catch (e) {
    const msg = (e as Error).message
    const status = msg === 'ROOM_NOT_FOUND' ? 404 : msg === 'ROOM_NOT_WAITING' ? 409 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
