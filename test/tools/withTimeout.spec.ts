'use sanity'

import { spawn } from 'node:child_process'
import { once } from 'node:events'

const WRAPPER = 'tools/withTimeout.ts'
const SPAWN_TIMEOUT_MS = 10_000
const NODE_BIN = process.execPath

interface RunResult {
  exit: number
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

const emptyResult: RunResult = { exit: -1, signal: null, stdout: '', stderr: '' }

async function runWrapper(args: readonly string[], env: Record<string, string> = {}): Promise<RunResult> {
  const child = spawn('tsx', [WRAPPER, ...args], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })
  // node:events#once is typed as `Promise<any[]>` — the actual ('exit') payload
  // is [code, signal] but the typing can't express the per-event narrowing.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- per-event narrowing of EventEmitter once() payload
  const [code, signal] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null]
  return { exit: code ?? -1, signal, stdout, stderr }
}

const WATCHDOG_MS = 200
const CHILD_EXIT_CODE = 42
const SUCCESS_EXIT_CODE = 0
const TIMEOUT_EXIT_CODE = 124
const INVALID_ARG_EXIT_CODE = 2

interface ExpectedExit {
  label: string
  code: number
}

interface WrapperScenario {
  scenario: string
  args: readonly string[]
  env: Record<string, string>
  expectedExit: ExpectedExit
  stderrFragments: string[]
}

const propagated = (code: number): ExpectedExit => ({ label: `the child's own exit code`, code })
const timedOut: ExpectedExit = { label: 'the timeout code', code: TIMEOUT_EXIT_CODE }
const invalidArgument: ExpectedExit = { label: 'the invalid-argument code', code: INVALID_ARG_EXIT_CODE }

const nodeScript = (source: string): readonly string[] => [NODE_BIN, '-e', source]

const scenarios: WrapperScenario[] = [
  {
    scenario: 'when the child exits cleanly',
    args: nodeScript(`process.exit(${SUCCESS_EXIT_CODE})`),
    env: {},
    expectedExit: propagated(SUCCESS_EXIT_CODE),
    stderrFragments: [],
  },
  {
    scenario: 'when the child exits with a non-zero code',
    args: nodeScript(`process.exit(${CHILD_EXIT_CODE})`),
    env: {},
    expectedExit: propagated(CHILD_EXIT_CODE),
    stderrFragments: [],
  },
  {
    scenario: 'when the watchdog fires against a hung child',
    args: nodeScript('setInterval(() => undefined, 1000)'),
    env: { TEST_WATCHDOG_MS: String(WATCHDOG_MS) },
    expectedExit: timedOut,
    stderrFragments: [`${WATCHDOG_MS}ms`, 'SIGKILL'],
  },
  {
    scenario: 'when the child kills itself with SIGTERM',
    args: nodeScript(`process.kill(process.pid, 'SIGTERM')`),
    env: {},
    expectedExit: timedOut,
    stderrFragments: [],
  },
  {
    scenario: 'when TEST_WATCHDOG_MS is not a number',
    args: nodeScript(`process.exit(${SUCCESS_EXIT_CODE})`),
    env: { TEST_WATCHDOG_MS: 'abc' },
    expectedExit: invalidArgument,
    stderrFragments: ['TEST_WATCHDOG_MS'],
  },
  {
    scenario: 'when TEST_WATCHDOG_MS is zero',
    args: nodeScript(`process.exit(${SUCCESS_EXIT_CODE})`),
    env: { TEST_WATCHDOG_MS: '0' },
    expectedExit: invalidArgument,
    stderrFragments: [],
  },
  {
    scenario: 'when TEST_WATCHDOG_MS is negative',
    args: nodeScript(`process.exit(${SUCCESS_EXIT_CODE})`),
    env: { TEST_WATCHDOG_MS: String(-WATCHDOG_MS) },
    expectedExit: invalidArgument,
    stderrFragments: ['TEST_WATCHDOG_MS'],
  },
  {
    scenario: 'when no command is provided',
    args: [],
    env: {},
    expectedExit: invalidArgument,
    stderrFragments: ['Usage:'],
  },
  {
    scenario: 'when the binary cannot be spawned',
    args: ['no-such-binary-xyz-spec'],
    env: {},
    expectedExit: invalidArgument,
    stderrFragments: ['failed to spawn child'],
  },
]

describe('tools/withTimeout', () => {
  scenarios.forEach(({ scenario, args, env, expectedExit, stderrFragments }: WrapperScenario): void => {
    describe(scenario, () => {
      let result: RunResult = emptyResult
      beforeAll(async () => {
        result = await runWrapper(args, env)
      }, SPAWN_TIMEOUT_MS)
      it(`should exit with ${expectedExit.label}`, () => {
        expect(result.exit).toBe(expectedExit.code)
      })
      stderrFragments.forEach((fragment: string): void => {
        it(`should report ${JSON.stringify(fragment)} in stderr`, () => {
          expect(result.stderr).toContain(fragment)
        })
      })
    })
  })
})
