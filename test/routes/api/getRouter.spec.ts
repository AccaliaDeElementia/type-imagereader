'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { cast } from '#testutils/typeGuards.js'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('routes/api getRouter()', () => {
  let applicationFake = cast<Application>({ App: Math.random() })
  let serverFake = cast<Server>({ Server: Math.random() })
  let socketServerFake = cast<WebSocketServer>({ Sockets: Math.random() })
  let routerStub = {
    get: sandbox.stub(),
    post: sandbox.stub(),
  }
  beforeEach(() => {
    applicationFake = cast<Application>({ App: Math.random() })
    serverFake = cast<Server>({ Server: Math.random() })
    socketServerFake = cast<WebSocketServer>({ Sockets: Math.random() })
    routerStub = {
      get: sandbox.stub(),
      post: sandbox.stub(),
    }
    sandbox.stub(Imports, 'initialize').resolves()
    sandbox.stub(Imports, 'Router').returns(cast<Router>(routerStub))
  })
  afterEach(() => {
    sandbox.restore()
  })
  const getRoutes = ['/', '/healthcheck', '/listing/*path', '/listing', '/bookmarks/*path', '/bookmarks']
  getRoutes.forEach((path) => {
    it(`should attach handler for get \`${path}\``, async () => {
      await getRouter(applicationFake, serverFake, socketServerFake)
      expect(routerStub.get.calledWith(path)).to.equal(true)
    })
  })

  const postRoutes = ['/navigate/latest', '/mark/read', '/mark/unread', '/bookmarks/add', '/bookmarks/remove']
  postRoutes.forEach((path) => {
    it(`should attach handler for post \`${path}\``, async () => {
      await getRouter(applicationFake, serverFake, socketServerFake)
      expect(routerStub.post.calledWith(path)).to.equal(true)
    })
  })

  const aliasedRoutes: Array<[string, string]> = [
    ['/listing', '/listing/*path'],
    ['/bookmarks', '/bookmarks/*path'],
  ]
  aliasedRoutes.forEach(([base, wildcard]) => {
    it(`should use same handler for \`${base}\` and \`${wildcard}\``, async () => {
      await getRouter(applicationFake, serverFake, socketServerFake)
      const fn1 = routerStub.get.getCalls().find((call) => call.args[0] === base)?.args[1] as unknown
      const fn2 = routerStub.get.getCalls().find((call) => call.args[0] === wildcard)?.args[1] as unknown
      assert(fn1 !== undefined)
      assert(fn2 !== undefined)
      expect(fn1).to.equal(fn2)
    })
  })
})
