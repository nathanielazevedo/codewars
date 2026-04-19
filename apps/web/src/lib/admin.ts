import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }) }
  }
  if (!session.user.isAdmin) {
    return { session: null, error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) }
  }
  return { session, error: null }
}
