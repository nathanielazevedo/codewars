import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// PUT /api/friends/[id] — accept/reject a friend request
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const { action } = await req.json()

  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ error: 'Action must be accept or reject' }, { status: 400 })
  }

  const friendship = await db.friendship.findUnique({ where: { id } })
  if (!friendship || friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (friendship.status !== 'pending') {
    return NextResponse.json({ error: 'Request already handled' }, { status: 400 })
  }

  const updated = await db.friendship.update({
    where: { id },
    data: { status: action === 'accept' ? 'accepted' : 'rejected' },
  })

  return NextResponse.json(updated)
}

// DELETE /api/friends/[id] — remove friend / cancel request
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  const friendship = await db.friendship.findUnique({ where: { id } })
  if (!friendship) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Only participants can delete
  if (friendship.requesterId !== session.user.id && friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.friendship.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
