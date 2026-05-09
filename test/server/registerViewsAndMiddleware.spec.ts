'use sanity'

import { expect } from 'chai'
import type { Express } from 'express'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { Imports, registerViewsAndMiddleware } from '#server.js'
import express from 'express'

const sandbox = Sinon.createSandbox()

type MiddlewareFn = (req: unknown, res: unknown, next: Sinon.SinonStub) => void

describe('Server registerRouters', () => {
  let staticStub = sandbox.stub()
  let appStub = { use: sandbox.stub(), set: sandbox.stub() }
  let appFake = cast<Express>(appStub)
  beforeEach(() => {
    staticStub = sandbox.stub(express, 'static')
    appStub = { use: sandbox.stub(), set: sandbox.stub() }
    appFake = cast<Express>(appStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should app.set() all views options', () => {
    registerViewsAndMiddleware(appFake)
    expect(appStub.use.callCount).to.equal(1)
  })
  it('should set views flag', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'views')?.args as unknown[] | undefined
    expect(args).to.have.lengthOf(2)
  })
  it('should set views path', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'views')?.args as unknown[] | undefined
    expect(args?.[1]).to.equal(`${Imports.dirname}/views`)
  })
  it('should set view engine', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'view engine')?.args as unknown[] | undefined
    expect(args).to.have.lengthOf(2)
  })
  it('should set pug as the selected view engine', () => {
    registerViewsAndMiddleware(appFake)
    const args = appStub.set.getCalls().find((c) => c.args[0] === 'view engine')?.args as unknown[] | undefined
    expect(args?.[1]).to.equal('pug')
  })
  it('should app.use() all middleware configs', () => {
    registerViewsAndMiddleware(appFake)
    expect(appStub.use.callCount).to.equal(1)
  })
  describe('Serve static middleware', () => {
    it('should configure serve static middleware', () => {
      registerViewsAndMiddleware(appFake)
      expect(staticStub.callCount).to.equal(1)
    })
    it('should configure serve static middleware with dist path', () => {
      registerViewsAndMiddleware(appFake)
      expect(staticStub.firstCall.args).to.deep.equal([`${Imports.dirname}/dist`])
    })
    it('should register serve static function as middleware', () => {
      const fn = cast<MiddlewareFn>(sandbox.stub())
      staticStub.returns(fn)
      registerViewsAndMiddleware(appFake)
      expect(appStub.use.firstCall.args[0]).to.equal(fn)
    })
  })
})
