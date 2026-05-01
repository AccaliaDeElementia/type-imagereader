'use sanity'

import { afterEach, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import Sinon from 'sinon'
import type { Debugger } from 'debug'
import { Functions, Imports } from '#utils/syncfolders'
import { Cast, StubToKnex } from '#testutils/TypeGuards'

const sandbox = Sinon.createSandbox()

const SOFT_LIMIT = 100_000
const FIRM_LIMIT = 250_000

const findCall = (stub: Sinon.SinonStub, predicate: (args: unknown[]) => boolean): Sinon.SinonSpyCall | undefined =>
  stub.getCalls().find((c) => predicate(c.args))

describe('utils/syncfolders function EmitSqliteSizeWarning()', () => {
  let loggerStub = sandbox.stub()
  let isPostgresStub = sandbox.stub()
  let knexFnFake = StubToKnex(sandbox.stub())

  beforeEach(() => {
    Functions.SqliteSizeWarningEmitted = false
    loggerStub = sandbox.stub()
    isPostgresStub = sandbox.stub(Imports, 'IsPostgres').returns(false)
    knexFnFake = StubToKnex(sandbox.stub())
  })
  afterEach(() => {
    sandbox.restore()
    Functions.SqliteSizeWarningEmitted = false
  })

  it('should not log when client is postgres', () => {
    isPostgresStub.returns(true)
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should not log when picture count is at the soft limit', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should not log when picture count is below the soft limit', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT - 1)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should emit a banner top line when soft limit is exceeded', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(loggerStub.firstCall.args[0]).to.match(/^=+$/v)
  })

  it('should emit a banner bottom line when soft limit is exceeded', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(loggerStub.lastCall.args[0]).to.match(/^=+$/v)
  })

  it('should emit a soft warning message when soft limit is exceeded', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.match(/soft recommended limit/v)
  })

  it('should include the actual picture count in the soft warning', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, 180_000)
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.contain('180,000')
  })

  it('should include the soft limit value in the soft warning', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.contain('100,000')
  })

  it('should emit a firm warning message when firm limit is exceeded', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.match(/firm recommended limit/v)
  })

  it('should include the firm limit value in the firm warning', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, 350_000)
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('WARNING:'))
    expect(call?.args[0]).to.contain('250,000')
  })

  it('should suppress the soft warning when the firm limit is also exceeded', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    const softCall = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].includes('soft recommended'))
    expect(softCall).to.equal(undefined)
  })

  it('should set SqliteSizeWarningEmitted to true after emitting', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    expect(Functions.SqliteSizeWarningEmitted).to.equal(true)
  })

  it('should not emit twice across separate invocations', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT + 1)
    loggerStub.resetHistory()
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(loggerStub.callCount).to.equal(0)
  })

  it('should not flip SqliteSizeWarningEmitted when client is postgres', () => {
    isPostgresStub.returns(true)
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, FIRM_LIMIT + 1)
    expect(Functions.SqliteSizeWarningEmitted).to.equal(false)
  })

  it('should not flip SqliteSizeWarningEmitted when count is below the soft limit', () => {
    Functions.EmitSqliteSizeWarning(Cast<Debugger>(loggerStub), knexFnFake, SOFT_LIMIT - 1)
    expect(Functions.SqliteSizeWarningEmitted).to.equal(false)
  })
})
