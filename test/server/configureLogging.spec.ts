'use sanity'

import type { Express } from 'express'
import { cast } from '#testutils/typeGuards.js'
import { configureLogging, Imports } from '#server.js'
import type { MockInstance } from 'vitest'

describe('Server configureLogging', () => {
  let helmetStub: MockInstance = vi.fn()
  let morganStub: MockInstance = vi.fn()
  let appStub = { use: vi.fn() }
  let appFake = cast<Express>(appStub)
  beforeEach(() => {
    helmetStub = vi.spyOn(Imports, 'helmet').mockImplementation(cast(() => undefined))
    morganStub = vi.spyOn(Imports, 'morgan').mockReturnValue(cast(undefined))
    appStub = { use: vi.fn() }
    appFake = cast<Express>(appStub)
    delete process.env.NODE_ENV
  })
  it('should not register any handler for unconfigured env variable', () => {
    configureLogging(appFake)
    expect(appStub.use.mock.calls.length).toBe(0)
  })
  it('should register a single handler for development mode', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(appStub.use.mock.calls.length).toBe(1)
  })
  it('should call morgan once for development mode', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(morganStub.mock.calls.length).toBe(1)
  })
  it('should app.use the morgan logger for development mode', () => {
    process.env.NODE_ENV = 'development'
    const logger = {}
    morganStub.mockReturnValue(logger)
    configureLogging(appFake)
    expect(appStub.use.mock.calls[0]?.[0]).toBe(logger)
  })
  it('should call morgan with the dev format', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(morganStub.mock.calls[0]?.[0]).toBe('dev')
  })
  it('should not call helmet in development mode', () => {
    process.env.NODE_ENV = 'development'
    configureLogging(appFake)
    expect(helmetStub.mock.calls.length).toBe(0)
  })
  it('should register a single handler for production mode', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(appStub.use.mock.calls.length).toBe(1)
  })
  it('should call helmet once for production mode', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(helmetStub.mock.calls.length).toBe(1)
  })
  it('should app.use the helmet middleware for production mode', () => {
    process.env.NODE_ENV = 'production'
    const middleware = {}
    helmetStub.mockReturnValue(middleware)
    configureLogging(appFake)
    expect(appStub.use.mock.calls[0]?.[0]).toBe(middleware)
  })
  it('should call helmet with one configuration argument', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(helmetStub.mock.calls[0]).toHaveLength(1)
  })
  it('should allow openweathermap.org images in the helmet CSP img-src directive', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    const opts = cast<{ contentSecurityPolicy?: { directives?: Record<string, string[]> } }>(
      helmetStub.mock.calls[0]?.[0],
    )
    expect(opts.contentSecurityPolicy?.directives?.['img-src']).toContain('https://openweathermap.org')
  })
  it('should allow https://localhost:8443 in the helmet CSP connect-src directive so the slideshow can fetch local weather', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    const opts = cast<{ contentSecurityPolicy?: { directives?: Record<string, string[]> } }>(
      helmetStub.mock.calls[0]?.[0],
    )
    expect(opts.contentSecurityPolicy?.directives?.['connect-src']).toContain('https://localhost:8443')
  })
  it('should not call morgan in production mode', () => {
    process.env.NODE_ENV = 'production'
    configureLogging(appFake)
    expect(morganStub.mock.calls.length).toBe(0)
  })
})
