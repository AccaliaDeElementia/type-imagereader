'use sanity'

import { assert, expect } from 'chai'
import type { Application, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '../../../routes/index'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/index function getRouter()', () => {
  const applicationFake = Cast<Application>({})
  const serverFake = Cast<Server>({})
  const socketsFake = Cast<WebSocketServer>({})
  let routerStub = { get: Sinon.stub() }
  let getRouterStub = Sinon.stub().returns(Cast<Router>(routerStub))
  beforeEach(() => {
    routerStub = { get: Sinon.stub() }
    getRouterStub = Sinon.stub(Imports, 'Router').returns(Cast<Router>(routerStub))
  })
  afterEach(() => {
    getRouterStub.restore()
  })
  it('should return constructed router', async () => {
    const result = await getRouter(applicationFake, serverFake, socketsFake)
    expect(result).to.equal(routerStub)
  })
  const endpoints = ['/', '/show', '/show/*']
  it('should register expected number of endpoints', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(routerStub.get.callCount).to.equal(endpoints.length)
  })
  endpoints.forEach((endpoint) => {
    it(`should register endpoint '${endpoint}`, async () => {
      await getRouter(applicationFake, serverFake, socketsFake)
      expect(routerStub.get.calledWith(endpoint)).to.equal(true)
    })
    it(`should register handler function for endpoint '${endpoint}`, async () => {
      await getRouter(applicationFake, serverFake, socketsFake)
      // eslint-disable-next-line max-nested-callbacks -- allow search
      const fn = routerStub.get.getCalls().find((call) => call.args[0] === endpoint)?.args[1] as unknown
      assert.isFunction(fn)
    })
  })
})
