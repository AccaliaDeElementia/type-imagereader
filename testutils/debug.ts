'use sanity'

import type { Debugger } from 'debug'
import { vi, type Mock, type MockInstance } from 'vitest'

import { cast } from './typeGuards.js'

// An inert Debugger that swallows every call. Use when a function under
// test requires a logger argument but the test isn't asserting against
// log output (e.g. integration tests, helpers under unit test).
export const noopLogger: Debugger = cast<Debugger>(() => undefined)

// Use when the function under test takes a logger as a parameter.
// The returned `fake` satisfies the Debugger type; the returned `stub`
// records calls made through it for assertions.
export function createLoggerFake(): { stub: Mock; fake: Debugger } {
  const stub = vi.fn()
  return { stub, fake: cast<Debugger>(stub) }
}

// Use when the function under test constructs its own logger by calling
// `target.debug(prefix)` internally. Returns the factory stub (assert the
// prefix passed to debug()) and the logger stub it returns (assert log
// messages). The same loggerStub is returned regardless of which prefix
// the function calls debug() with.
export function stubDebug(target: { debug: (namespace: string) => Debugger }): {
  debugStub: MockInstance
  loggerStub: MockInstance
} {
  const loggerStub = vi.fn()
  const debugStub = vi.spyOn(target, 'debug').mockReturnValue(cast<Debugger>(loggerStub))
  return { debugStub, loggerStub }
}
