import { auth } from '@/auth'
import { createMatch } from '@/lib/matches'
import { getProblem } from '@/lib/problems'
import { startRoom } from '@/lib/rooms'
import { NextResponse } from 'next/server'

const DEFAULT_PROBLEM_SLUG = 'two-sum'

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  try {
    const code = params.code.toUpperCase()
    const room = await startRoom(code, session.user.id, {
      bypassMinPlayers: session.user.isAdmin,
    })

    const problem = await getProblem(DEFAULT_PROBLEM_SLUG)
    if (!problem) {
      return NextResponse.json({ error: 'DEFAULT_PROBLEM_NOT_FOUND' }, { status: 500 })
    }

    await createMatch({
      id: room.matchId,
      roomCode: room.code,
      problemId: problem.id,
      players: room.players,
    })

    return NextResponse.json({ room })
  } catch (e) {
    const msg = (e as Error).message
    const status = msg === 'ROOM_NOT_FOUND' ? 404 : msg === 'NOT_HOST' ? 403 : 422
    return NextResponse.json({ error: msg }, { status })
  }
}
