import { auth } from '@/auth'
import { getMatch, readMatch, writeMatch, publishEvent, recordProgress } from '@/lib/matches'
import { getProblem, type Language } from '@/lib/problems'
import { runTestCase, type TestResult, type ExecutionStatus } from '@/lib/piston'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = (await req.json()) as {
    matchId?: string
    language?: Language
    code?: string
  }
  if (!body.matchId || !body.language || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const match = await getMatch(body.matchId)
  if (!match) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 })
  if (match.status !== 'active') {
    return NextResponse.json({ error: 'MATCH_NOT_ACTIVE' }, { status: 409 })
  }
  if (!match.players.some((p) => p.userId === session.user.id)) {
    return NextResponse.json({ error: 'NOT_IN_MATCH' }, { status: 403 })
  }

  const playerState = match.playerStates[session.user.id]

  if (playerState && playerState.frozenUntil > Date.now()) {
    return NextResponse.json({ error: 'YOU_ARE_FROZEN' }, { status: 422 })
  }

  if (playerState?.mirage) {
    playerState.mirage = false
    await writeMatch(match)
    return NextResponse.json({
      status: 'wrong_answer' as ExecutionStatus,
      testResults: [
        { passed: false, status: 'wrong_answer' as ExecutionStatus, stdout: null, stderr: null, timeSec: null, memoryKb: null },
      ],
      testsPassed: playerState.testsPassed,
      totalTests: playerState.totalTests,
      finished: playerState.finishedAt !== null,
      mirage: true,
    })
  }

  const problem = await getProblem(match.problemId)
  if (!problem) return NextResponse.json({ error: 'PROBLEM_NOT_FOUND' }, { status: 500 })

  const results: TestResult[] = []
  let overallStatus: ExecutionStatus = 'accepted'
  let passedCount = 0

  for (const tc of problem.testCases) {
    const r = await runTestCase({
      language: body.language,
      code: body.code,
      stdin: tc.input,
      expectedOutput: tc.expectedOutput,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
    })
    results.push(r)
    if (r.passed) passedCount++
    else if (overallStatus === 'accepted') overallStatus = r.status
  }

  const { match: updated, finished } = await recordProgress(
    body.matchId,
    session.user.id,
    session.user.username,
    passedCount,
    problem.testCases.length,
  )

  return NextResponse.json({
    status: overallStatus,
    testResults: results,
    testsPassed: passedCount,
    totalTests: problem.testCases.length,
    finished,
    matchStatus: updated?.status ?? match.status,
  })
}
