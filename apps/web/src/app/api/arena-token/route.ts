import { auth } from '@/auth'
import { signArenaToken } from '@/lib/arena-token'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const token = signArenaToken({
    userId: session.user.id,
    username: session.user.username,
  })
  return NextResponse.json({ token })
}
