'use sanity'

// Wrap a child process with a wall-clock timeout. SIGKILLs the child and exits
// 124 (matching GNU timeout convention) if the wall-clock expires before the
// child finishes.
//
// Guards against test-runner hang-on-exit failure modes: a runner that finishes
// every test but never returns the process, which would otherwise wedge a
// non-interactive test/build script until the CI job itself times out.
//
// Configurable via TEST_WATCHDOG_MS env var (default 120000 = 120s). Set to a
// large value to effectively disable for debugging (e.g. TEST_WATCHDOG_MS=86400000).

import { spawn } from 'node:child_process'

const DEFAULT_TIMEOUT_MS = 120_000
const TIMEOUT_EXIT_CODE = 124
const INVALID_ARG_EXIT_CODE = 2
const POST_KILL_GRACE_MS = 500
const DECIMAL_RADIX = 10

const rawTimeout = process.env.TEST_WATCHDOG_MS ?? String(DEFAULT_TIMEOUT_MS)
const timeoutMs = Number.parseInt(rawTimeout, DECIMAL_RADIX)
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error(`withTimeout: invalid TEST_WATCHDOG_MS value: ${rawTimeout}`)
  process.exit(INVALID_ARG_EXIT_CODE)
}

const [cmd, ...args] = process.argv.slice(2)
if (cmd === undefined) {
  console.error('withTimeout: no command provided')
  console.error('Usage: tsx scripts/withTimeout.ts <command> [args...]')
  process.exit(INVALID_ARG_EXIT_CODE)
}

// Inherit npm's PATH (which includes node_modules/.bin) so unqualified binary
// names like `vitest` resolve. `shell: true` would also work for resolution
// but Node 26+ deprecates args-with-shell (DEP0190) and the shell layer eats
// the child's exit code on some commands.
const child = spawn(cmd, args, { stdio: 'inherit' })

const timer = setTimeout(() => {
  console.error(`\nwithTimeout: ${timeoutMs}ms wall-clock elapsed before '${cmd}' exited; sending SIGKILL`)
  child.kill('SIGKILL')
  // Brief grace so the SIGKILL takes effect before we exit. .unref() so the
  // trailing timer doesn't itself keep us alive past the child's death.
  setTimeout(() => {
    process.exit(TIMEOUT_EXIT_CODE)
  }, POST_KILL_GRACE_MS).unref()
}, timeoutMs)

child.on('exit', (code, signal) => {
  clearTimeout(timer)
  if (signal === 'SIGKILL' || signal === 'SIGTERM') {
    process.exit(TIMEOUT_EXIT_CODE)
  }
  process.exit(code ?? 0)
})

child.on('error', (err: Error) => {
  clearTimeout(timer)
  console.error('withTimeout: failed to spawn child:', err.message)
  process.exit(INVALID_ARG_EXIT_CODE)
})
