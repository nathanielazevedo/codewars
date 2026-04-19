import { requireAdmin } from '@/lib/admin'
import { db } from '@code-arena/db'
import { listProblems } from '@/lib/problems'
import { NextResponse } from 'next/server'

// GET /api/admin/problems — list all problems
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const problems = await listProblems()
  return NextResponse.json(problems)
}

// POST /api/admin/problems — create a new problem
export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const { title, slug, description, difficulty, tags, starterCode, testCases, timeLimitMs, memoryLimitMb } = body

  if (!title || !slug || !description || !difficulty) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase alphanumeric with hyphens' }, { status: 400 })
  }

  const existing = await db.problem.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
  }

  const problem = await db.problem.create({
    data: {
      title,
      slug,
      description,
      difficulty,
      tags: tags ?? [],
      starterCode: starterCode ?? {},
      testCases: testCases ?? [],
      timeLimitMs: timeLimitMs ?? 2000,
      memoryLimitMb: memoryLimitMb ?? 256,
    },
  })

  return NextResponse.json(problem, { status: 201 })
}
