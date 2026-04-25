import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { joinQuickmatch, leaveQuickmatch, quickmatchStatus } from '@/lib/queue'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimit('queue', session.user.id)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const status = await joinQuickmatch({
    userId: session.user.id,
    username: session.user.username,
    elo: session.user.elo,
    avatarUrl: session.user.image ?? null,
    joinedAt: Date.now(),
    isAdmin: session.user.isAdmin,
  })
  return NextResponse.json(status)
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = await checkRateLimit('queue', session.user.id)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const status = await leaveQuickmatch(session.user.id)
  return NextResponse.json(status)
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const status = await quickmatchStatus(session.user.id)
  return NextResponse.json(status)
}
