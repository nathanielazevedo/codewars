import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { joinQuickmatch, leaveQuickmatch, quickmatchStatus } from '@/lib/queue'

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const status = await joinQuickmatch({
    userId: session.user.id,
    username: session.user.username,
    elo: session.user.elo,
    avatarUrl: session.user.image ?? null,
    joinedAt: Date.now(),
  })
  return NextResponse.json(status)
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const status = await leaveQuickmatch(session.user.id)
  return NextResponse.json(status)
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const status = await quickmatchStatus(session.user.id)
  return NextResponse.json(status)
}
