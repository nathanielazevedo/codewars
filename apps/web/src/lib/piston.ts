import type { Language } from './problems'

const PISTON_URL = process.env.PISTON_URL ?? 'http://localhost:2000'

const LANGUAGE_VERSIONS: Record<Language, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '*' },
  python: { language: 'python', version: '*' },
}

export type ExecutionStatus =
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'compile_error'
  | 'runtime_error'
  | 'internal_error'

export type TestResult = {
  passed: boolean
  status: ExecutionStatus
  stdout: string
  stderr: string
  timeSec: number | null
  memoryKb: number | null
}

interface PistonRunResult {
  stdout: string
  stderr: string
  output: string
  code: number | null
  signal: string | null
  message: string | null
  status: string | null // RE, SG, TO, OL, EL, XX
  cpu_time: number | null
  wall_time: number | null
  memory: number | null
}

interface PistonResponse {
  language: string
  version: string
  compile?: PistonRunResult
  run: PistonRunResult
}

function mapPistonStatus(run: PistonRunResult, passed: boolean): ExecutionStatus {
  if (run.status === 'TO') return 'time_limit_exceeded'
  if (run.status === 'RE' || run.status === 'SG') return 'runtime_error'
  if (run.status === 'XX') return 'internal_error'
  if (run.code !== 0 && run.code !== null) return 'runtime_error'
  return passed ? 'accepted' : 'wrong_answer'
}

export async function runTestCase(params: {
  language: Language
  code: string
  stdin: string
  expectedOutput: string
  timeLimitMs: number
  memoryLimitMb: number
}): Promise<TestResult> {
  const lang = LANGUAGE_VERSIONS[params.language]

  const res = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: lang.language,
      version: lang.version,
      files: [{ content: params.code }],
      stdin: params.stdin,
      run_timeout: params.timeLimitMs,
      run_memory_limit: params.memoryLimitMb * 1024 * 1024,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Piston HTTP ${res.status}: ${body}`)
  }

  const data = (await res.json()) as PistonResponse

  // Check compile errors first
  if (data.compile && data.compile.code !== 0 && data.compile.code !== null) {
    return {
      passed: false,
      status: 'compile_error',
      stdout: '',
      stderr: data.compile.stderr || data.compile.output,
      timeSec: null,
      memoryKb: null,
    }
  }

  const run = data.run
  const actualOutput = run.stdout.trimEnd()
  const expectedOutput = params.expectedOutput.trimEnd()
  const passed = actualOutput === expectedOutput && !run.status

  const status = mapPistonStatus(run, passed)

  return {
    passed: status === 'accepted',
    status,
    stdout: run.stdout,
    stderr: run.stderr,
    timeSec: run.wall_time !== null ? run.wall_time / 1000 : null,
    memoryKb: run.memory !== null ? Math.round(run.memory / 1024) : null,
  }
}
