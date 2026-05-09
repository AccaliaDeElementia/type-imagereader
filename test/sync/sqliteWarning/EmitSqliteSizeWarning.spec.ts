'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Debugger } from 'debug'
import { EmitSqliteSizeWarning, SqliteWarning, Imports } from '#sync/sqliteWarning.js'
import { cast, stubToKnex } from '#testutils/TypeGuards.js'
import { findStubCall } from '#testutils/Sinon.js'

const sandbox = Sinon.createSandbox()

const SOFT_LIMIT = 100_000
const FIRM_LIMIT = 250_000

describe('sync/sqliteWarning EmitSqliteSizeWarning()', () => {
  let loggerStub = sandbox.stub()
  let isPostgresStub = sandbox.stub()
  let knexFnFake = stubToKnex(sandbox.stub())

  beforeEach(() => {
    SqliteWarning.SqliteSizeWarningEmitted = false
    loggerStub = sandbox.stub()
    isPostgresStub = sandbox.stub(Imports, 'IsPostgres').returns(false)
    knexFnFake = stubToKnex(sandbox.stub())
  })
  afterEach(() => {
    sandbox.restore()
    SqliteWarning.SqliteSizeWarningEmitted = false
  })

  it('should not log when client is postgres', () => {
    isPostgresStub.returns(true)
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should not log when picture count is at the soft limit', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should not log when picture count is below the soft limit', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT - 1)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should emit a banner top line when soft limit is exceeded', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(loggerStub.firstCall.args[0]).to.match(/^=+$/v)
  })

  it('should emit a banner bottom line when soft limit is exceeded', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(loggerStub.lastCall.args[0]).to.match(/^=+$/v)
  })

  it('should emit a soft warning message when soft limit is exceeded', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.match(/soft recommended limit/v)
  })

  it('should include the actual picture count in the soft warning', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, 180_000)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.contain('180,000')
  })

  it('should include the soft limit value in the soft warning', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.contain('100,000')
  })

  it('should emit a firm warning message when firm limit is exceeded', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.match(/firm recommended limit/v)
  })

  it('should include the firm limit value in the firm warning', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, 350_000)
    const call = findStubCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.contain('250,000')
  })

  it('should suppress the soft warning when the firm limit is also exceeded', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    const softCall = findStubCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].includes('soft recommended'),
    )
    expect(softCall).to.equal(undefined)
  })

  it('should set SqliteSizeWarningEmitted to true after emitting', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(SqliteWarning.SqliteSizeWarningEmitted).to.equal(true)
  })

  it('should not emit twice across separate invocations', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    loggerStub.resetHistory()
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should not flip SqliteSizeWarningEmitted when client is postgres', () => {
    isPostgresStub.returns(true)
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(SqliteWarning.SqliteSizeWarningEmitted).to.equal(false)
  })

  it('should not flip SqliteSizeWarningEmitted when count is below the soft limit', () => {
    EmitSqliteSizeWarning(cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT - 1)
    expect(SqliteWarning.SqliteSizeWarningEmitted).to.equal(false)
  })
})
