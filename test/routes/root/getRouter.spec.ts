'use sanity'

import { assert, expect } from 'chai'
import type { Application, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '#routes/root.js'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

describe('routes/root getRouter()', () => {
  const applicationFake = cast<Application>({})
  const serverFake = cast<Server>({})
  const socketsFake = cast<WebSocketServer>({})
  let routerStub = { get: sandbox.stub() }
  beforeEach(() => {
    routerStub = { get: sandbox.stub() }
    sandbox.stub(Imports, 'Router').returns(cast<Router>(routerStub))
  })
  afterEach(() => {
    sandbox.restore()
  })
  const endpoints = ['/', '/show', '/show/*path']
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
      const fn = routerStub.get.getCalls().find((call) => call.args[0] === endpoint)?.args[1] as unknown
      assert.isFunction(fn)
    })
  })
})
