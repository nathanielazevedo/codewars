import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { getH2HBulk } from '@/lib/rivalries'
import { NextResponse } from 'next/server'

// GET /api/rivalry?opponents=id1,id2 — returns H2H records from the caller's perspective
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('opponents') ?? ''
  const opponents = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20)

  const records = await getH2HBulk(session.user.id, opponents)

  // Also attach friendship relationship so the client can render Add-friend buttons
  const f = opponents.length
    ? await db.friendship.findMany({
        where: {
          OR: [
            { requesterId: session.user.id, addresseeId: { in: opponents } },
            { addresseeId: session.user.id, requesterId: { in: opponents } },
          ],
        },
      })
    : []

  const friendshipByOpponent: Record<
    string,
    { id: string; status: 'pending' | 'accepted' | 'rejected'; iRequested: boolean }
  > = {}
  for (const row of f) {
    const other = row.requesterId === session.user.id ? row.addresseeId : row.requesterId
    friendshipByOpponent[other] = {
      id: row.id,
      status: row.status as 'pending' | 'accepted' | 'rejected',
      iRequested: row.requesterId === session.user.id,
    }
  }

  return NextResponse.json({ records, friendships: friendshipByOpponent })
}
