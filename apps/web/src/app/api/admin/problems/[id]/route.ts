import { requireAdmin } from '@/lib/admin'
import { db } from '@code-arena/db'
import { NextResponse } from 'next/server'

// GET /api/admin/problems/[id] — get a single problem
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const problem = await db.problem.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
  })
  if (!problem) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json(problem)
}

// PUT /api/admin/problems/[id] — update a problem
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.problem.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const body = await req.json()
  const { title, slug, description, difficulty, tags, starterCode, testCases, timeLimitMs, memoryLimitMb } = body

  if (slug && slug !== existing.slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must be lowercase alphanumeric with hyphens' }, { status: 400 })
    }
    const conflict = await db.problem.findUnique({ where: { slug } })
    if (conflict) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
  }

  const problem = await db.problem.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(difficulty !== undefined && { difficulty }),
      ...(tags !== undefined && { tags }),
      ...(starterCode !== undefined && { starterCode }),
      ...(testCases !== undefined && { testCases }),
      ...(timeLimitMs !== undefined && { timeLimitMs }),
      ...(memoryLimitMb !== undefined && { memoryLimitMb }),
    },
  })

  return NextResponse.json(problem)
}

// DELETE /api/admin/problems/[id] — delete a problem
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.problem.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  await db.problem.delete({ where: { id: params.id } })
  return NextResponse.json({ deleted: true })
}
