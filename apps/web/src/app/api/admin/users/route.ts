import { requireAdmin } from '@/lib/admin'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// GET /api/admin/users — list all users
export async function GET(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const url = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''

  const users = await db.user.findMany({
    where: search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
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

  return NextResponse.json(users)
}
