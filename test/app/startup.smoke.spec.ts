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
      child = spawn('npx', ['tsx', '.'], {
        env: { ...process.env, SKIP_SYNC: '1', DATA_DIR: dataDir, PORT: String(port), DEBUG: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      child.stderr?.on('data', (c: Buffer) => {
        stderr += c.toString('utf8')
      })
      const res = await waitForHealthcheck(port, Date.now() + HEALTHCHECK_DEADLINE_MS)
      healthStatus = res.status
      healthBody = await res.text()
    })

    afterAll(async () => {
      if (child?.exitCode === null) {
        child.kill('SIGKILL')
        await once(child, 'exit')
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
