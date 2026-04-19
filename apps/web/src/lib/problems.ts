import { db } from '@code-arena/db'

export type Language = 'javascript' | 'python'

export type TestCase = {
  input: string
  expectedOutput: string
}

export type Problem = {
  id: string
  slug: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  starterCode: Record<Language, string>
  testCases: TestCase[]
  timeLimitMs: number
  memoryLimitMb: number
}

function toProblem(row: {
  id: string
  slug: string
  title: string
  description: string
  difficulty: string
  starterCode: unknown
  testCases: unknown
  timeLimitMs: number
  memoryLimitMb: number
}): Problem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty as Problem['difficulty'],
    starterCode: (row.starterCode ?? {}) as Record<Language, string>,
    testCases: (row.testCases ?? []) as TestCase[],
    timeLimitMs: row.timeLimitMs,
    memoryLimitMb: row.memoryLimitMb,
  }
}

export async function getProblem(id: string): Promise<Problem | null> {
  const row = await db.problem.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  })
  return row ? toProblem(row) : null
}

export async function listProblems(): Promise<Problem[]> {
  const rows = await db.problem.findMany({ orderBy: { createdAt: 'asc' } })
  return rows.map(toProblem)
}
