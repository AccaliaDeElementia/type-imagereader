'use sanity'

import type { Debugger } from 'debug'
import { emitSqliteSizeWarning, SqliteWarning, Imports } from '#sync/sqliteWarning.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { findStubCall } from '#testutils/mocks.js'
import type { MockInstance } from 'vitest'

const SOFT_LIMIT = 100_000
const FIRM_LIMIT = 250_000

describe('sync/sqliteWarning emitSqliteSizeWarning()', () => {
  let loggerStub: MockInstance = vi.fn()
  let isPostgresStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(vi.fn())

  beforeEach(() => {
    SqliteWarning.sqliteSizeWarningEmitted = false
    loggerStub = vi.fn()
    isPostgresStub = vi.spyOn(Imports, 'isPostgres').mockReturnValue(false)
    knexFnFake = stubToKnex(vi.fn())
  })
  afterEach(() => {
    vi.restoreAllMocks()
    SqliteWarning.sqliteSizeWarningEmitted = false
  })

  it('should not log when client is postgres', () => {
    isPostgresStub.mockReturnValue(true)
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(loggerStub.mock.calls.length).toBe(0)
  })

  it('should not log when picture count is at the soft limit', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT)
    expect(loggerStub.mock.calls.length).toBe(0)
  })

  it('should not log when picture count is below the soft limit', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT - 1)
    expect(loggerStub.mock.calls.length).toBe(0)
  })

  it('should emit a banner top line when soft limit is exceeded', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(loggerStub.mock.calls[0]?.[0]).toMatch(/^=+$/v)
  })

  it('should emit a banner bottom line when soft limit is exceeded', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(loggerStub.mock.lastCall?.[0]).toMatch(/^=+$/v)
  })

  it('should emit a soft warning message when soft limit is exceeded', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.[0]).toMatch(/soft recommended limit/v)
  })

  it('should include the actual picture count in the soft warning', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, 180_000)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.[0]).toContain('180,000')
  })

  it('should include the soft limit value in the soft warning', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.[0]).toContain('100,000')
  })

  it('should emit a firm warning message when firm limit is exceeded', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.[0]).toMatch(/firm recommended limit/v)
  })

  it('should include the firm limit value in the firm warning', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, 350_000)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.[0]).toContain('250,000')
  })

  it('should suppress the soft warning when the firm limit is also exceeded', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    const softCall = findStubCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].includes('soft recommended'),
    )
    expect(softCall).toBe(undefined)
  })

  it('should set sqliteSizeWarningEmitted to true after emitting', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(SqliteWarning.sqliteSizeWarningEmitted).toBe(true)
  })

  it('should not emit twice across separate invocations', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    loggerStub.mockClear()
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(loggerStub.mock.calls.length).toBe(0)
  })

  it('should not flip sqliteSizeWarningEmitted when client is postgres', () => {
    isPostgresStub.mockReturnValue(true)
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(SqliteWarning.sqliteSizeWarningEmitted).toBe(false)
  })

  it('should not flip sqliteSizeWarningEmitted when count is below the soft limit', () => {
    emitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT - 1)
    expect(SqliteWarning.sqliteSizeWarningEmitted).toBe(false)
  })
})
