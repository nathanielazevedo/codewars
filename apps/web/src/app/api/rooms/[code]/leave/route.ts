import { auth } from '@/auth'
import { leaveRoom } from '@/lib/rooms'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  await leaveRoom(params.code.toUpperCase(), session.user.id)
  return NextResponse.json({ ok: true })
}
