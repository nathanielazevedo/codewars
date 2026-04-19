import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// GET /api/users/[username] — public profile
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      bio: true,
      githubUrl: true,
      linkedinUrl: true,
      elo: true,
      xp: true,
      rankTier: true,
      createdAt: true,
      _count: {
        select: {
          matchPlayers: true,
          submissions: { where: { status: 'accepted' } },
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...user,
    matchesPlayed: user._count.matchPlayers,
    problemsSolved: user._count.submissions,
    _count: undefined,
  })
}
