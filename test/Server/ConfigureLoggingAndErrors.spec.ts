'use sanity'

import { assert, expect } from 'chai'
import type { Express, Response } from 'express'
import Sinon from 'sinon'
import { Cast } from '../testutils/TypeGuards'
import { Functions, Imports } from '../../Server'

describe('Server function ConfigureLoggingAndErrors', () => {
  let helmetStub = Sinon.stub()
  let morganStub = Sinon.stub()
  let appStub = { use: Sinon.stub() }
  let appFake = Cast<Express>(appStub)
  let responseStub = { status: Sinon.stub().returnsThis(), json: Sinon.stub().returnsThis() }
  beforeEach(() => {
    helmetStub = Sinon.stub(Imports, 'helmet')
    morganStub = Sinon.stub(Imports, 'morgan')
    appStub = { use: Sinon.stub() }
    appFake = Cast<Express>(appStub)
    responseStub = { status: Sinon.stub().returnsThis(), json: Sinon.stub().returnsThis() }
    delete process.env.NODE_ENV
  })
  afterEach(() => {
    morganStub.restore()
    helmetStub.restore()
  })
  it('should not register logger for unconfigured env variable', () => {
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(appStub.use.callCount).to.equal(1)
  })
  it('should register single handler for development mode', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(appStub.use.callCount).to.equal(2)
  })
  it('should register morgan logger for development mode', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(morganStub.callCount).to.equal(1)
  })
  it('should app.use morgan logger for development mode', () => {
    process.env.NODE_ENV = 'development'
    const logger = {}
    morganStub.returns(logger)
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(appStub.use.firstCall.args[0]).to.equal(logger)
  })
  it('should register morgan logger in dev format', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(morganStub.firstCall.args[0]).to.equal('dev')
  })
  it('should not register helmet logger for development mode', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(helmetStub.callCount).to.equal(0)
  })
  it('should register single handler for production mode', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(appStub.use.callCount).to.equal(2)
  })
  it('should register helmet logger for production mode', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(helmetStub.callCount).to.equal(1)
  })
  it('should register helmet logger for production mode', () => {
    process.env.NODE_ENV = 'production'
    const logger = {}
    helmetStub.returns(logger)
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(appStub.use.firstCall.args[0]).to.equal(logger)
  })
  it('should register helmet logger with defauult options', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(helmetStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should not register morgan logger for production mode', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(morganStub.callCount).to.equal(0)
  })
  it('should register error handler as final call to app.use', () => {
    Functions.ConfigureLoggingAndErrors(appFake)
    expect(appStub.use.lastCall.args).to.have.lengthOf(1)
  })
  it('should register function as error handler as final call to app.use', () => {
    Functions.ConfigureLoggingAndErrors(appFake)
    const fn = appStub.use.lastCall.args[0] as unknown
    assert.isFunction(fn)
  })
  const errorHandlerTests: Array<[string, () => void]> = [
    ['set status code', () => expect(responseStub.status.callCount).to.equal(1)],
    ['set bad request status code', () => expect(responseStub.status.firstCall.args).to.deep.equal([400])],
    ['send JSON message', () => expect(responseStub.json.callCount).to.equal(1)],
    ['send encoded JSON error', () => expect(responseStub.json.firstCall.args).to.deep.equal([{ error: 'FOO!' }])],
  ]
  errorHandlerTests.forEach(([title, validationFn]) => {
    it(`should ${title} for error handler`, () => {
      Functions.ConfigureLoggingAndErrors(appFake)
      const fn = Cast<(err: Error, _: unknown, res: Response, __: unknown) => void>(appStub.use.lastCall.args[0])
      const err = new Error('FOO!')
      fn(err, null, Cast<Response>(responseStub), null)
      validationFn()
    })
  })
})
