import { auth } from '@/auth'
import { createRoom } from '@/lib/rooms'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const room = await createRoom({
    userId: session.user.id,
    username: session.user.username,
    elo: session.user.elo,
    avatarUrl: session.user.image ?? null,
    joinedAt: Date.now(),
  })
  return NextResponse.json({ room })
}
