'use sanity'

import type { Express } from 'express'
import { cast } from '#testutils/typeGuards.js'
import { Imports, registerViewsAndMiddleware } from '#server.js'
import express from 'express'
import type { MockInstance } from 'vitest'

type MiddlewareFn = (req: unknown, res: unknown, next: MockInstance) => void
type AppLocals = { asset?: (url: string) => string } & Record<string, unknown>
interface AppStub {
  use: MockInstance
  set: MockInstance
  locals: AppLocals
}

describe('Server registerRouters', () => {
  let staticStub: MockInstance = vi.fn()
  let buildAssetVersionsStub: MockInstance = vi.fn()
  let assetUrlStub: MockInstance = vi.fn()
  let appStub: AppStub = {
    use: vi.fn(),
    set: vi.fn(),
    locals: {},
  }
  let appFake = cast<Express>(appStub)
  beforeEach(() => {
    staticStub = vi.spyOn(express, 'static').mockImplementation(cast(() => undefined))
    buildAssetVersionsStub = vi.spyOn(Imports, 'buildAssetVersions').mockReturnValue({})
    assetUrlStub = vi.spyOn(Imports, 'assetUrl').mockReturnValue('/stubbed')
    appStub = {
      use: vi.fn(),
      set: vi.fn(),
      locals: {},
    }
    appFake = cast<Express>(appStub)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should app.set() all views options', () => {
    registerViewsAndMiddleware(appFake)
    expect(appStub.use.mock.calls.length).toBe(1)
  })
  it('should set views flag', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.mock.calls.find((c) => c[0] === 'views') as unknown[] | undefined
    expect(args).toHaveLength(2)
  })
  it('should set views path', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.mock.calls.find((c) => c[0] === 'views') as unknown[] | undefined
    expect(args?.[1]).toBe(`${Imports.dirname}/views`)
  })
  it('should set view engine', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.mock.calls.find((c) => c[0] === 'view engine') as unknown[] | undefined
    expect(args).toHaveLength(2)
  })
  it('should set pug as the selected view engine', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.mock.calls.find((c) => c[0] === 'view engine') as unknown[] | undefined
    expect(args?.[1]).toBe('pug')
  })
  it('should app.use() all middleware configs', () => {
    registerViewsAndMiddleware(appFake)
    expect(appStub.use.mock.calls.length).toBe(1)
  })
  describe('Serve static middleware', () => {
    it('should configure serve static middleware', () => {
      registerViewsAndMiddleware(appFake)
      expect(staticStub.mock.calls.length).toBe(1)
    })
    it('should configure serve static middleware with dist path', () => {
      registerViewsAndMiddleware(appFake)
      expect(staticStub.mock.calls[0]).toEqual([`${Imports.dirname}/dist`])
    })
    it('should register serve static function as middleware', () => {
      const fn = cast<MiddlewareFn>(vi.fn())
      staticStub.mockReturnValue(fn)
      registerViewsAndMiddleware(appFake)
      expect(appStub.use.mock.calls[0]?.[0]).toBe(fn)
    })
  })
  describe('asset version helper', () => {
    it('should call buildAssetVersions once', () => {
      registerViewsAndMiddleware(appFake)
      expect(buildAssetVersionsStub.mock.calls.length).toBe(1)
    })
    it('should call buildAssetVersions with the dist directory', () => {
      registerViewsAndMiddleware(appFake)
      expect(buildAssetVersionsStub.mock.calls[0]?.[0]).toBe(`${Imports.dirname}/dist`)
    })
    it('should set app.locals.asset to a function', () => {
      registerViewsAndMiddleware(appFake)
      expect(typeof appStub.locals.asset).toBe('function')
    })
    it('should route asset helper calls through Imports.assetUrl', () => {
      registerViewsAndMiddleware(appFake)
      appStub.locals.asset?.('/scripts/app.js')
      expect(assetUrlStub.mock.calls.length).toBe(1)
    })
    it('should pass the versions map and urlPath to Imports.assetUrl', () => {
      const versions = { '/foo.js': 'deadbeef' }
      buildAssetVersionsStub.mockReturnValue(versions)
      registerViewsAndMiddleware(appFake)
      appStub.locals.asset?.('/foo.js')
      expect(assetUrlStub.mock.calls[0]).toEqual([versions, '/foo.js'])
    })
    it('should return the result of Imports.assetUrl from the helper', () => {
      assetUrlStub.mockReturnValue('/foo.js?v=deadbeef')
      registerViewsAndMiddleware(appFake)
      expect(appStub.locals.asset?.('/foo.js')).toBe('/foo.js?v=deadbeef')
    })
  })
})
