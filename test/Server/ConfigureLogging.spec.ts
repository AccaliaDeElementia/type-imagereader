'use sanity'

import { expect } from 'chai'
import type { Express } from 'express'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards.js'
import { Functions, Imports } from '#Server.js'

const sandbox = Sinon.createSandbox()

describe('Server function ConfigureLogging', () => {
  let helmetStub = sandbox.stub()
  let morganStub = sandbox.stub()
  let appStub = { use: sandbox.stub() }
  let appFake = Cast<Express>(appStub)
  beforeEach(() => {
    helmetStub = sandbox.stub(Imports, 'helmet')
    // sandbox.stub(Imports, 'morgan') would trigger morgan's deprecated `default`
    // property getter via sinon's mirrorProperties, emitting a spurious warning.
    // sandbox.replace bypasses mirrorProperties, avoiding the read entirely.
    morganStub = sandbox.stub()
    sandbox.replace(Imports, 'morgan', Cast<typeof Imports.morgan>(morganStub))
    appStub = { use: sandbox.stub() }
    appFake = Cast<Express>(appStub)
    delete process.env.NODE_ENV
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should not register any handler for unconfigured env variable', () => {
    Functions.ConfigureLogging(appFake)
    expect(appStub.use.callCount).to.equal(0)
  })
  it('should register a single handler for development mode', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLogging(appFake)
    expect(appStub.use.callCount).to.equal(1)
  })
  it('should call morgan once for development mode', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLogging(appFake)
    expect(morganStub.callCount).to.equal(1)
  })
  it('should app.use the morgan logger for development mode', () => {
    process.env.NODE_ENV = 'development'
    const logger = {}
    morganStub.returns(logger)
    Functions.ConfigureLogging(appFake)
    expect(appStub.use.firstCall.args[0]).to.equal(logger)
  })
  it('should call morgan with the dev format', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLogging(appFake)
    expect(morganStub.firstCall.args[0]).to.equal('dev')
  })
  it('should not call helmet in development mode', () => {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLogging(appFake)
    expect(helmetStub.callCount).to.equal(0)
  })
  it('should register a single handler for production mode', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLogging(appFake)
    expect(appStub.use.callCount).to.equal(1)
  })
  it('should call helmet once for production mode', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLogging(appFake)
    expect(helmetStub.callCount).to.equal(1)
  })
  it('should app.use the helmet middleware for production mode', () => {
    process.env.NODE_ENV = 'production'
    const middleware = {}
    helmetStub.returns(middleware)
    Functions.ConfigureLogging(appFake)
    expect(appStub.use.firstCall.args[0]).to.equal(middleware)
  })
  it('should call helmet with one configuration argument', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLogging(appFake)
    expect(helmetStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should allow openweathermap.org images in the helmet CSP img-src directive', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLogging(appFake)
    const opts = Cast<{ contentSecurityPolicy?: { directives?: Record<string, string[]> } }>(
      helmetStub.firstCall.args[0],
    )
    expect(opts.contentSecurityPolicy?.directives?.['img-src']).to.include('https://openweathermap.org')
  })
  it('should allow https://localhost:8443 in the helmet CSP connect-src directive so the slideshow can fetch local weather', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLogging(appFake)
    const opts = Cast<{ contentSecurityPolicy?: { directives?: Record<string, string[]> } }>(
      helmetStub.firstCall.args[0],
    )
    expect(opts.contentSecurityPolicy?.directives?.['connect-src']).to.include('https://localhost:8443')
  })
  it('should not call morgan in production mode', () => {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLogging(appFake)
    expect(morganStub.callCount).to.equal(0)
  })
})
