import { db } from '@code-arena/db'
import type { ProblemCategory } from '@code-arena/types'

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
  category: ProblemCategory
  starterCode: Record<Language, string>
  harness: Record<Language, string>
  testCases: TestCase[]
  timeLimitMs: number
  memoryLimitMb: number
  matchDurationSec: number
}

function toProblem(row: {
  id: string
  slug: string
  title: string
  description: string
  difficulty: string
  category: string
  starterCode: unknown
  harness: unknown
  testCases: unknown
  timeLimitMs: number
  memoryLimitMb: number
  matchDurationSec: number
}): Problem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty as Problem['difficulty'],
    category: row.category as ProblemCategory,
    starterCode: (row.starterCode ?? {}) as Record<Language, string>,
    harness: (row.harness ?? {}) as Record<Language, string>,
    testCases: (row.testCases ?? []) as TestCase[],
    timeLimitMs: row.timeLimitMs,
    memoryLimitMb: row.memoryLimitMb,
    matchDurationSec: row.matchDurationSec,
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
