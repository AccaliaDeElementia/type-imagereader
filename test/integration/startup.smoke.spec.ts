'use sanity'

import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { setTimeout as sleep } from 'node:timers/promises'

const STARTUP_TIMEOUT_MS = 15_000
const HEALTHCHECK_DEADLINE_MS = 12_000
const HEALTHCHECK_POLL_INTERVAL_MS = 100
const SHUTDOWN_GRACE_MS = 2_000

async function pickFreePort(): Promise<number> {
  const srv = createServer()
  srv.unref()
  srv.listen(0)
  await once(srv, 'listening')
  const addr = srv.address()
  srv.close()
  await once(srv, 'close')
  if (addr === null || typeof addr === 'string') {
    throw new Error('Could not determine ephemeral port')
  }
  return addr.port
}

async function waitForHealthcheck(port: number, deadlineAt: number): Promise<Response> {
  const url = `http://127.0.0.1:${port}/api/healthcheck`
  /* eslint-disable no-await-in-loop -- polling is intentionally serial */
  while (Date.now() <= deadlineAt) {
    try {
      const res = await fetch(url)
      if (res.status === 200) return res
    } catch {
      // ECONNREFUSED while server starts — retry
    }
    await sleep(HEALTHCHECK_POLL_INTERVAL_MS)
  }
  /* eslint-enable no-await-in-loop */
  throw new Error(`Server did not respond to ${url} within deadline`)
}

describe(
  'app.ts startup smoke',
  () => {
    let child: ChildProcess | undefined = undefined
    let dataDir = ''
    let healthStatus = 0
    let healthBody = ''
    let stderr = ''

    beforeAll(async () => {
      dataDir = mkdtempSync(join(tmpdir(), 'imagereader-smoke-'))
      const port = await pickFreePort()
      // `detached: true` puts the child into its own process group so a single
      // signal sent with `process.kill(-child.pid, …)` reaches every descendant
      // (npx → tsx → node), not just the immediate shell wrapper. Without that,
      // SIGKILL on the wrapper would orphan the real app process — historically
      // accumulating zombies that held the postgres pool open.
      //
      // `DB_CLIENT=sqlite` + `DB_FILENAME=:memory:` route the child off postgres
      // entirely. The healthcheck endpoint never queries the DB, so the only DB
      // activity is the migration run during init() — single-connection,
      // self-contained, no need for a real server (or even a file).
      child = spawn('npx', ['tsx', '.'], {
        env: {
          ...process.env,
          SKIP_SYNC: '1',
          DATA_DIR: dataDir,
          PORT: String(port),
          DEBUG: '',
          DB_CLIENT: 'sqlite',
          DB_FILENAME: ':memory:',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      })
      child.stderr?.on('data', (c: Buffer) => {
        stderr += c.toString('utf8')
      })
      const res = await waitForHealthcheck(port, Date.now() + HEALTHCHECK_DEADLINE_MS)
      healthStatus = res.status
      healthBody = await res.text()
    })

    afterAll(async () => {
      if (child?.exitCode === null && child.pid !== undefined) {
        const groupPid = -child.pid
        const exitPromise = once(child, 'exit')
        // SIGTERM first — gives express/knex a moment to close cleanly so we
        // don't leak orphaned postgres-style connection state on the way out.
        try {
          process.kill(groupPid, 'SIGTERM')
        } catch {
          // Group might already be gone.
        }
        const winner = await Promise.race([
          exitPromise.then(() => 'exited' as const),
          sleep(SHUTDOWN_GRACE_MS).then(() => 'timeout' as const),
        ])
        if (winner === 'timeout') {
          try {
            process.kill(groupPid, 'SIGKILL')
          } catch {
            // Already dead.
          }
          await exitPromise
        }
      }
      if (dataDir !== '') rmSync(dataDir, { recursive: true, force: true })
    })

    it('should respond 200 to /api/healthcheck', () => {
      expect(healthStatus).toBe(200)
    })

    it('should return body "OK" from /api/healthcheck', () => {
      expect(healthBody).toBe('OK')
    })

    it('should not emit ReferenceError during startup', () => {
      expect(stderr).not.toContain('ReferenceError')
    })

    it('should not emit uncaught exception or unhandled rejection during startup', () => {
      expect(stderr).not.toMatch(/UnhandledPromiseRejection|UncaughtException/v)
    })
  },
  STARTUP_TIMEOUT_MS,
)
