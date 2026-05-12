'use sanity'

import type { Express } from 'express'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { Imports, registerViewsAndMiddleware } from '#server.js'
import express from 'express'

const sandbox = Sinon.createSandbox()

type MiddlewareFn = (req: unknown, res: unknown, next: Sinon.SinonStub) => void
type AppLocals = { asset?: (url: string) => string } & Record<string, unknown>
interface AppStub {
  use: Sinon.SinonStub
  set: Sinon.SinonStub
  locals: AppLocals
}

describe('Server registerRouters', () => {
  let staticStub = sandbox.stub()
  let buildAssetVersionsStub = sandbox.stub()
  let assetUrlStub = sandbox.stub()
  let appStub: AppStub = {
    use: sandbox.stub(),
    set: sandbox.stub(),
    locals: {},
  }
  let appFake = cast<Express>(appStub)
  beforeEach(() => {
    staticStub = sandbox.stub(express, 'static')
    buildAssetVersionsStub = sandbox.stub(Imports, 'buildAssetVersions').returns({})
    assetUrlStub = sandbox.stub(Imports, 'assetUrl').returns('/stubbed')
    appStub = {
      use: sandbox.stub(),
      set: sandbox.stub(),
      locals: {},
    }
    appFake = cast<Express>(appStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should app.set() all views options', () => {
    registerViewsAndMiddleware(appFake)
    expect(appStub.use.callCount).toBe(1)
  })
  it('should set views flag', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'views')?.args as unknown[] | undefined
    expect(args).toHaveLength(2)
  })
  it('should set views path', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'views')?.args as unknown[] | undefined
    expect(args?.[1]).toBe(`${Imports.dirname}/views`)
  })
  it('should set view engine', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'view engine')?.args as unknown[] | undefined
    expect(args).toHaveLength(2)
  })
  it('should set pug as the selected view engine', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'view engine')?.args as unknown[] | undefined
    expect(args?.[1]).toBe('pug')
  })
  it('should app.use() all middleware configs', () => {
    registerViewsAndMiddleware(appFake)
    expect(appStub.use.callCount).toBe(1)
  })
  describe('Serve static middleware', () => {
    it('should configure serve static middleware', () => {
      registerViewsAndMiddleware(appFake)
      expect(staticStub.callCount).toBe(1)
    })
    it('should configure serve static middleware with dist path', () => {
      registerViewsAndMiddleware(appFake)
      expect(staticStub.firstCall.args).toEqual([`${Imports.dirname}/dist`])
    })
    it('should register serve static function as middleware', () => {
      const fn = cast<MiddlewareFn>(sandbox.stub())
      staticStub.returns(fn)
      registerViewsAndMiddleware(appFake)
      expect(appStub.use.firstCall.args[0]).toBe(fn)
    })
  })
  describe('asset version helper', () => {
    it('should call buildAssetVersions once', () => {
      registerViewsAndMiddleware(appFake)
      expect(buildAssetVersionsStub.callCount).toBe(1)
    })
    it('should call buildAssetVersions with the dist directory', () => {
      registerViewsAndMiddleware(appFake)
      expect(buildAssetVersionsStub.firstCall.args[0]).toBe(`${Imports.dirname}/dist`)
    })
    it('should set app.locals.asset to a function', () => {
      registerViewsAndMiddleware(appFake)
      expect(typeof appStub.locals.asset).toBe('function')
    })
    it('should route asset helper calls through Imports.assetUrl', () => {
      registerViewsAndMiddleware(appFake)
      appStub.locals.asset?.('/scripts/app.js')
      expect(assetUrlStub.callCount).toBe(1)
    })
    it('should pass the versions map and urlPath to Imports.assetUrl', () => {
      const versions = { '/foo.js': 'deadbeef' }
      buildAssetVersionsStub.returns(versions)
      registerViewsAndMiddleware(appFake)
      appStub.locals.asset?.('/foo.js')
      expect(assetUrlStub.firstCall.args).toEqual([versions, '/foo.js'])
    })
    it('should return the result of Imports.assetUrl from the helper', () => {
      assetUrlStub.returns('/foo.js?v=deadbeef')
      registerViewsAndMiddleware(appFake)
      expect(appStub.locals.asset?.('/foo.js')).toBe('/foo.js?v=deadbeef')
    })
  })
})
