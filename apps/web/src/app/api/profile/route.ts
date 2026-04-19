import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// GET /api/profile — get current user's profile
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      bio: true,
      githubUrl: true,
      linkedinUrl: true,
      elo: true,
      xp: true,
      rankTier: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user)
}

// PUT /api/profile — update current user's profile
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.username === 'string') {
    const username = body.username.trim().toLowerCase()
    if (!/^[a-z0-9_]{2,32}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 2-32 chars: letters, numbers, underscores' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { username } })
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    data.username = username
  }

  if (typeof body.bio === 'string') {
    data.bio = body.bio.slice(0, 280) || null
  }

  if (typeof body.avatarUrl === 'string') {
    const url = body.avatarUrl.trim()
    if (url && !/^https?:\/\/.+/.test(url)) {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 })
    }
    data.avatarUrl = url || null
  }

  if (typeof body.githubUrl === 'string') {
    const url = body.githubUrl.trim()
    if (url && !/^https?:\/\/(www\.)?github\.com\/.+/.test(url)) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }
    data.githubUrl = url || null
  }

  if (typeof body.linkedinUrl === 'string') {
    const url = body.linkedinUrl.trim()
    if (url && !/^https?:\/\/(www\.)?linkedin\.com\/.+/.test(url)) {
      return NextResponse.json({ error: 'Invalid LinkedIn URL' }, { status: 400 })
    }
    data.linkedinUrl = url || null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      bio: true,
      githubUrl: true,
      linkedinUrl: true,
      elo: true,
      xp: true,
      rankTier: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user)
}
