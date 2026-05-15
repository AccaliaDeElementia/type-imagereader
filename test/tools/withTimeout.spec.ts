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

describe('tools/withTimeout', () => {
  describe('when the child exits cleanly', () => {
    let result: RunResult = emptyResult
    beforeAll(async () => {
      result = await runWrapper([NODE_BIN, '-e', 'process.exit(0)'])
    }, SPAWN_TIMEOUT_MS)
    it('should exit 0', () => {
      expect(result.exit).toBe(0)
    })
  })

  describe('when the child exits with a non-zero code', () => {
    let result: RunResult = emptyResult
    beforeAll(async () => {
      result = await runWrapper([NODE_BIN, '-e', 'process.exit(42)'])
    }, SPAWN_TIMEOUT_MS)
    it('should propagate the child exit code', () => {
      expect(result.exit).toBe(42)
    })
  })

  describe('when the watchdog fires against a hung child', () => {
    let result: RunResult = emptyResult
    beforeAll(async () => {
      result = await runWrapper([NODE_BIN, '-e', 'setInterval(() => undefined, 1000)'], {
        TEST_WATCHDOG_MS: '200',
      })
    }, SPAWN_TIMEOUT_MS)
    it('should exit 124', () => {
      expect(result.exit).toBe(124)
    })
    it('should mention the configured timeout in stderr', () => {
      expect(result.stderr).toContain('200ms')
    })
    it('should mention SIGKILL in stderr', () => {
      expect(result.stderr).toContain('SIGKILL')
    })
  })

  describe('when TEST_WATCHDOG_MS is not a number', () => {
    let result: RunResult = emptyResult
    beforeAll(async () => {
      result = await runWrapper([NODE_BIN, '-e', 'process.exit(0)'], { TEST_WATCHDOG_MS: 'abc' })
    }, SPAWN_TIMEOUT_MS)
    it('should exit 2', () => {
      expect(result.exit).toBe(2)
    })
    it('should name the bad value in stderr', () => {
      expect(result.stderr).toContain('TEST_WATCHDOG_MS')
    })
  })

  describe('when TEST_WATCHDOG_MS is zero', () => {
    let result: RunResult = emptyResult
    beforeAll(async () => {
      result = await runWrapper([NODE_BIN, '-e', 'process.exit(0)'], { TEST_WATCHDOG_MS: '0' })
    }, SPAWN_TIMEOUT_MS)
    it('should exit 2', () => {
      expect(result.exit).toBe(2)
    })
  })

  describe('when no command is provided', () => {
    let result: RunResult = emptyResult
    beforeAll(async () => {
      result = await runWrapper([])
    }, SPAWN_TIMEOUT_MS)
    it('should exit 2', () => {
      expect(result.exit).toBe(2)
    })
    it('should print usage in stderr', () => {
      expect(result.stderr).toContain('Usage:')
    })
  })

  describe('when the binary cannot be spawned', () => {
    let result: RunResult = emptyResult
    beforeAll(async () => {
      result = await runWrapper(['no-such-binary-xyz-spec'])
    }, SPAWN_TIMEOUT_MS)
    it('should exit 2', () => {
      expect(result.exit).toBe(2)
    })
    it('should report the spawn failure in stderr', () => {
      expect(result.stderr).toContain('failed to spawn child')
    })
  })
})
