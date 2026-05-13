'use sanity'

import type { SinonSandbox, SinonStub } from 'sinon'
import type { Debugger } from 'debug'
import { vi, type MockInstance } from 'vitest'

import { cast } from './typeGuards.js'

// An inert Debugger that swallows every call. Use when a function under
// test requires a logger argument but the test isn't asserting against
// log output (e.g. integration tests, helpers under unit test).
export const noopLogger: Debugger = cast<Debugger>(() => undefined)

// Use when the function under test takes a logger as a parameter.
// The returned `fake` satisfies the Debugger type; the returned `stub`
// records calls made through it for assertions.
// LEGACY (sinon-based) — kept until callers migrate to createLoggerFakeVi.
export function createLoggerFake(sandbox: SinonSandbox): { stub: SinonStub; fake: Debugger } {
  const stub = sandbox.stub()
  return { stub, fake: cast<Debugger>(stub) }
}

// Use when the function under test constructs its own logger by calling
// `target.debug(prefix)` internally. Returns the factory stub (assert the
// prefix passed to debug()) and the logger stub it returns (assert log
// messages). The same loggerStub is returned regardless of which prefix
// the function calls debug() with.
//
// Two overloads during the sinon -> vitest migration:
// - stubDebug(target)          — vitest-native; returns vitest MockInstance pair
// - stubDebug(sandbox, target) — legacy; returns SinonStub pair (callers not yet migrated)
export function stubDebug(target: { debug: (namespace: string) => Debugger }): {
  debugStub: MockInstance
  loggerStub: MockInstance
}
export function stubDebug(
  sandbox: SinonSandbox,
  target: { debug: (namespace: string) => Debugger },
): { debugStub: SinonStub; loggerStub: SinonStub }
export function stubDebug(
  sandboxOrTarget: SinonSandbox | { debug: (namespace: string) => Debugger },
  maybeTarget?: { debug: (namespace: string) => Debugger },
): { debugStub: SinonStub | MockInstance; loggerStub: SinonStub | MockInstance } {
  if ('stub' in sandboxOrTarget && typeof sandboxOrTarget.stub === 'function' && maybeTarget !== undefined) {
    // Legacy sinon path.
    const loggerStub = sandboxOrTarget.stub()
    const debugStub = sandboxOrTarget.stub(maybeTarget, 'debug').returns(cast<Debugger>(loggerStub))
    return { debugStub, loggerStub }
  }
  // Vitest path. The overload guarantees `sandboxOrTarget` is the target when no `maybeTarget` is given.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- discriminated by overload signature; the runtime branch above eliminates the sandbox case.
  const target = sandboxOrTarget as { debug: (namespace: string) => Debugger }
  const loggerStub = vi.fn()
  const debugStub = vi.spyOn(target, 'debug').mockReturnValue(cast<Debugger>(loggerStub))
  return { debugStub, loggerStub }
}
