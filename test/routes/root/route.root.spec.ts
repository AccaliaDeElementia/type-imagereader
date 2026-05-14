'use sanity'

import type { Application, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '#routes/root.js'
import { cast } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import type { MockInstance } from 'vitest'

describe('routes/root route /', () => {
  let routeFn: (_: Request, __: Response) => void = voidFn()
  let requestFake = cast<Request>({})
  let resposeStub = { redirect: vi.fn() }
  let responseFake = cast<Response>(resposeStub)
  beforeEach(async () => {
    const applicationFake = cast<Application>({})
    const serverFake = cast<Server>({})
    const socketsFake = cast<WebSocketServer>({})
    const routerStub = { get: vi.fn() }
    let getRouterStub: MockInstance | undefined = undefined
    try {
      getRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerStub))
      await getRouter(applicationFake, serverFake, socketsFake)
      routeFn = cast<(_: Request, __: Response) => void>(routerStub.get.mock.calls.find((c) => c[0] === '/')?.[1])
    } finally {
      getRouterStub?.mockRestore()
    }
    requestFake = cast<Request>({})
    resposeStub = { redirect: vi.fn() }
    responseFake = cast<Response>(resposeStub)
  })
  it('should redirect response', () => {
    routeFn(requestFake, responseFake)
    expect(resposeStub.redirect.mock.calls.length).toBe(1)
  })
  it('should redirect with temporary redirect', () => {
    routeFn(requestFake, responseFake)
    expect(resposeStub.redirect.mock.calls[0]?.[0]).toBe(302)
  })
  it("should redirect to '/show'", () => {
    routeFn(requestFake, responseFake)
    expect(resposeStub.redirect.mock.calls[0]?.[1]).toBe('/show')
  })
})
