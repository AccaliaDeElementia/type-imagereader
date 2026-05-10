'use sanity'

import type { Express } from 'express'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { configureLogging, Imports } from '#server.js'

const sandbox = Sinon.createSandbox()

describe('Server configureLogging', () => {
  let helmetStub = sandbox.stub()
  let morganStub = sandbox.stub()
  let appStub = { use: sandbox.stub() }
  let appFake = cast<Express>(appStub)
  beforeEach(() => {
    helmetStub = sandbox.stub(Imports, 'helmet')
    // sandbox.stub(Imports, 'morgan') would trigger morgan's deprecated `default`
    // property getter via sinon's mirrorProperties, emitting a spurious warning.
    // sandbox.replace bypasses mirrorProperties, avoiding the read entirely.
    morganStub = sandbox.stub()
    sandbox.replace(Imports, 'morgan', cast<typeof Imports.morgan>(morganStub))
    appStub = { use: sandbox.stub() }
    appFake = cast<Express>(appStub)
    delete process.env.NODE_ENV
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should not register any handler for unconfigured env variable', () => {
    configureLogging(appFake)
    expect(appStub.use.callCount).toBe(0)
  })
  it('should register a single handler for development mode', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(appStub.use.callCount).toBe(1)
  })
  it('should call morgan once for development mode', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(morganStub.callCount).toBe(1)
  })
  it('should app.use the morgan logger for development mode', () => {
    process.env.NODE_ENV = 'development'
    const logger = {}
    morganStub.returns(logger)
    configureLogging(appFake)
    expect(appStub.use.firstCall.args[0]).toBe(logger)
  })
  it('should call morgan with the dev format', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(morganStub.firstCall.args[0]).toBe('dev')
  })
  it('should not call helmet in development mode', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(helmetStub.callCount).toBe(0)
  })
  it('should register a single handler for production mode', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(appStub.use.callCount).toBe(1)
  })
  it('should call helmet once for production mode', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(helmetStub.callCount).toBe(1)
  })
  it('should app.use the helmet middleware for production mode', () => {
    process.env.NODE_ENV = 'production'
    const middleware = {}
    helmetStub.returns(middleware)
    configureLogging(appFake)
    expect(appStub.use.firstCall.args[0]).toBe(middleware)
  })
  it('should call helmet with one configuration argument', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(helmetStub.firstCall.args).toHaveLength(1)
  })
  it('should allow openweathermap.org images in the helmet CSP img-src directive', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    const opts = cast<{ contentSecurityPolicy?: { directives?: Record<string, string[]> } }>(
      helmetStub.firstCall.args[0],
    )
    expect(opts.contentSecurityPolicy?.directives?.['img-src']).toContain('https://openweathermap.org')
  })
  it('should allow https://localhost:8443 in the helmet CSP connect-src directive so the slideshow can fetch local weather', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    const opts = cast<{ contentSecurityPolicy?: { directives?: Record<string, string[]> } }>(
      helmetStub.firstCall.args[0],
    )
    expect(opts.contentSecurityPolicy?.directives?.['connect-src']).toContain('https://localhost:8443')
  })
  it('should not call morgan in production mode', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(morganStub.callCount).toBe(0)
  })
})
