import { auth } from '@/auth'
import { getPresence } from '@/lib/presence'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('userIds') ?? ''
  const userIds = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100)
  const presence = await getPresence(userIds)
  return NextResponse.json({ presence })
}
