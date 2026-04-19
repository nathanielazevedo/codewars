import { auth } from '@/auth'
import { getRoom } from '@/lib/rooms'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const room = await getRoom(params.code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ room })
}
