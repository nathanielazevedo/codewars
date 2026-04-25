import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }) }
  }
  const fresh = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })
  if (!fresh?.isAdmin) {
    return { session: null, error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) }
  }
  return { session, error: null }
}
