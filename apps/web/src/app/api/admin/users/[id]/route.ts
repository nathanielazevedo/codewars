import { requireAdmin } from '@/lib/admin'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// PUT /api/admin/users/[id] — update user
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()

  const allowedFields: Record<string, unknown> = {}
  if (typeof body.isAdmin === 'boolean') allowedFields.isAdmin = body.isAdmin
  if (typeof body.elo === 'number') allowedFields.elo = body.elo
  if (typeof body.rankTier === 'string') allowedFields.rankTier = body.rankTier

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Prevent self-demotion
  if (id === session!.user.id && allowedFields.isAdmin === false) {
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
  }

  const user = await db.user.update({
    where: { id },
    data: allowedFields,
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      provider: true,
      elo: true,
      rankTier: true,
      isAdmin: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user)
}
