'use sanity'

import { assert, expect } from 'chai'
import type { Express } from 'express'
import Sinon from 'sinon'
import { Cast } from '../testutils/TypeGuards'
import { Imports, Functions } from '../../Server'
import express from 'express'

type MiddlewareFn = (req: unknown, res: unknown, next: Sinon.SinonStub) => void

describe('Server function RegisterRouters', () => {
  let sassMiddlewareStub = Sinon.stub()

  let browerifyMiddlewareStub = Sinon.stub()
  let browserifyStub = Sinon.stub().resolves()
  let staticStub = Sinon.stub()
  let appStub = { use: Sinon.stub(), set: Sinon.stub() }
  let appFake = Cast<Express>(appStub)
  beforeEach(() => {
    sassMiddlewareStub = Sinon.stub(Imports, 'sassMiddleware')
    browserifyStub = Sinon.stub().resolves()
    browerifyMiddlewareStub = Sinon.stub(Imports, 'browserifyMiddleware').resolves(browserifyStub)
    staticStub = Sinon.stub(express, 'static')
    appStub = { use: Sinon.stub(), set: Sinon.stub() }
    appFake = Cast<Express>(appStub)
  })
  afterEach(() => {
    sassMiddlewareStub.restore()
    browerifyMiddlewareStub.restore()
    staticStub.restore()
  })
  it('should app.set() all views options', () => {
    Functions.RegisterViewsAndMiddleware(appFake)
    expect(appStub.use.callCount).to.equal(3)
  })
  it('should set views flag', () => {
    Functions.RegisterViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'views')?.args as unknown[] | undefined
    expect(args).to.have.lengthOf(2)
  })
  it('should set views path', () => {
    Functions.RegisterViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'views')?.args as unknown[] | undefined
    expect(args?.[1]).to.equal(Imports.dirname + '/views')
  })
  it('should set view engine', () => {
    Functions.RegisterViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'view engine')?.args as unknown[] | undefined
    expect(args).to.have.lengthOf(2)
  })
  it('should set pug as the selected view engine', () => {
    Functions.RegisterViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'view engine')?.args as unknown[] | undefined
    expect(args?.[1]).to.equal('pug')
  })
  it('should app.use() all middleware configs', () => {
    Functions.RegisterViewsAndMiddleware(appFake)
    expect(appStub.use.callCount).to.equal(3)
  })
  describe('Sass Middleware', () => {
    let middleware: MiddlewareFn = Sinon.stub()
    let sassStub = Sinon.stub().resolves()
    beforeEach(() => {
      sassStub = Sinon.stub().resolves()
      sassMiddlewareStub.returns(sassStub)
      Functions.RegisterViewsAndMiddleware(appFake)
      middleware = Cast<MiddlewareFn>(appStub.use.firstCall.args[0])
    })
    it('should build sassMiddleware', () => {
      expect(sassMiddlewareStub.callCount).to.equal(1)
    })
    it('should build sassMiddleware with config options', () => {
      assert.isObject(sassMiddlewareStub.firstCall.args[0])
    })
    it('should set sassMiddleware mount path', () => {
      expect(sassMiddlewareStub.firstCall.args).to.deep.equal([
        {
          mountPath: Imports.dirname + '/public',
          watchdir: '/stylesheets',
        },
      ])
    })
    it('should call into sass from middelware', () => {
      middleware({}, {}, Sinon.stub())
      expect(sassStub.callCount).to.equal(1)
    })
    it('should call into sass with correct arg count from middelware', () => {
      middleware({}, {}, Sinon.stub())
      expect(sassStub.firstCall.args).to.have.lengthOf(3)
    })
    it('should pass request to sass from middelware', () => {
      const request = {}
      middleware(request, {}, Sinon.stub())
      expect(sassStub.firstCall.args[0]).to.equal(request)
    })
    it('should pass request to sass from middelware', () => {
      const response = {}
      middleware({}, response, Sinon.stub())
      expect(sassStub.firstCall.args[1]).to.equal(response)
    })
    it('should pass request to sass from middelware', () => {
      const nextFn = Sinon.stub()
      middleware({}, {}, nextFn)
      expect(sassStub.firstCall.args[2]).to.equal(nextFn)
    })
    it('should not call nextFn directly', () => {
      const nextFn = Sinon.stub()
      middleware({}, {}, nextFn)
      expect(nextFn.callCount).to.equal(0)
    })
    it('should call nextFn when sass rejects', async () => {
      const nextFn = Sinon.stub()
      sassStub.rejects('FOO')
      middleware({}, {}, nextFn)
      await Promise.resolve() // wait out the promise
      expect(nextFn.callCount).to.equal(1)
    })
  })
  describe('Browserify Middleware', () => {
    let middleware: MiddlewareFn = Sinon.stub()
    let browserifyStub = Sinon.stub().resolves()
    beforeEach(() => {
      browserifyStub = Sinon.stub().resolves()
      browerifyMiddlewareStub.returns(browserifyStub)
      Functions.RegisterViewsAndMiddleware(appFake)
      middleware = Cast<MiddlewareFn>(appStub.use.secondCall.args[0])
    })
    it('should build browserifyMiddleware', () => {
      expect(browerifyMiddlewareStub.callCount).to.equal(1)
    })
    it('should build browserifyMiddleware with config options', () => {
      assert.isObject(browerifyMiddlewareStub.firstCall.args[0])
    })
    it('should set browserifyMiddleware mount path', () => {
      expect(browerifyMiddlewareStub.firstCall.args).to.deep.equal([
        {
          basePath: Imports.dirname + '/public',
          watchPaths: ['/scripts', '/bundles'],
        },
      ])
    })
    it('should call into browserify from middelware', () => {
      middleware({}, {}, Sinon.stub())
      expect(browserifyStub.callCount).to.equal(1)
    })
    it('should call into browserify with correct arg count from middelware', () => {
      middleware({}, {}, Sinon.stub())
      expect(browserifyStub.firstCall.args).to.have.lengthOf(3)
    })
    it('should pass request to browserify from middelware', () => {
      const request = {}
      middleware(request, {}, Sinon.stub())
      expect(browserifyStub.firstCall.args[0]).to.equal(request)
    })
    it('should pass request to browserify from middelware', () => {
      const response = {}
      middleware({}, response, Sinon.stub())
      expect(browserifyStub.firstCall.args[1]).to.equal(response)
    })
    it('should pass request to browserify from middelware', () => {
      const nextFn = Sinon.stub()
      middleware({}, {}, nextFn)
      expect(browserifyStub.firstCall.args[2]).to.equal(nextFn)
    })
    it('should not call nextFn directly', () => {
      const nextFn = Sinon.stub()
      middleware({}, {}, nextFn)
      expect(nextFn.callCount).to.equal(0)
    })
    it('should call nextFn when browserify rejects', async () => {
      const nextFn = Sinon.stub()
      browserifyStub.rejects('FOO')
      middleware({}, {}, nextFn)
      await Promise.resolve() // wait out the promise
      expect(nextFn.callCount).to.equal(1)
    })
  })
  describe('Serve static middleware', () => {
    it('should configure serve static middleware', () => {
      Functions.RegisterViewsAndMiddleware(appFake)
      expect(staticStub.callCount).to.equal(1)
    })
    it('should configure serve static middleware with public path', () => {
      Functions.RegisterViewsAndMiddleware(appFake)
      expect(staticStub.firstCall.args).to.deep.equal([Imports.dirname + '/public'])
    })
    it('should register serve static function as middleware', () => {
      const fn = Sinon.stub()
      staticStub.returns(fn)
      Functions.RegisterViewsAndMiddleware(appFake)
      expect(appStub.use.thirdCall.args[0]).to.equal(fn)
    })
  })
})
