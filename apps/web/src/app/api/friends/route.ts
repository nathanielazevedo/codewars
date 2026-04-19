import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// GET /api/friends — list friends + pending requests
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const userId = session.user.id

  const [sent, received] = await Promise.all([
    db.friendship.findMany({
      where: { requesterId: userId },
      include: {
        addressee: {
          select: { id: true, username: true, avatarUrl: true, elo: true, rankTier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.friendship.findMany({
      where: { addresseeId: userId },
      include: {
        requester: {
          select: { id: true, username: true, avatarUrl: true, elo: true, rankTier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const friends = [
    ...sent.filter((f) => f.status === 'accepted').map((f) => ({ ...f.addressee, friendshipId: f.id })),
    ...received.filter((f) => f.status === 'accepted').map((f) => ({ ...f.requester, friendshipId: f.id })),
  ]

  const incoming = received
    .filter((f) => f.status === 'pending')
    .map((f) => ({ ...f.requester, friendshipId: f.id }))

  const outgoing = sent
    .filter((f) => f.status === 'pending')
    .map((f) => ({ ...f.addressee, friendshipId: f.id }))

  return NextResponse.json({ friends, incoming, outgoing })
}

// POST /api/friends — send friend request
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { username } = await req.json()
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { username } })
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (target.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 })
  }

  // Check existing relationship in either direction
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: target.id },
        { requesterId: target.id, addresseeId: session.user.id },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ error: 'Already friends' }, { status: 409 })
    }
    if (existing.status === 'pending') {
      // If they sent us a request, accept it
      if (existing.requesterId === target.id) {
        const updated = await db.friendship.update({
          where: { id: existing.id },
          data: { status: 'accepted' },
        })
        return NextResponse.json(updated)
      }
      return NextResponse.json({ error: 'Request already sent' }, { status: 409 })
    }
    // If rejected, allow re-sending by updating
    if (existing.requesterId === session.user.id) {
      const updated = await db.friendship.update({
        where: { id: existing.id },
        data: { status: 'pending' },
      })
      return NextResponse.json(updated, { status: 201 })
    }
  }

  const friendship = await db.friendship.create({
    data: {
      requesterId: session.user.id,
      addresseeId: target.id,
    },
  })

  return NextResponse.json(friendship, { status: 201 })
}
