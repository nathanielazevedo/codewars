import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { leaveQuickmatch } from '@/lib/queue'

// Separate POST endpoint for navigator.sendBeacon (can't send DELETE).
export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  await leaveQuickmatch(session.user.id)
  return NextResponse.json({ ok: true })
}
