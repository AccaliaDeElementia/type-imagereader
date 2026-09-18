'use sanity'

import { disconnect, Internals, WebSockets, type WebSocket } from '#public/scripts/slideshow/sockets.js'
import { cast } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

describe('public/slideshow/sockets disconnect()', () => {
  const fakeDisconnect = vi.fn()
  const fakeSocket = cast<WebSocket>({ disconnect: fakeDisconnect })
  beforeEach(() => {
    mountDom(new JSDOM('<html></html>'))
    WebSockets.socket = fakeSocket
    fakeDisconnect.mockClear()
  })
  afterEach(() => {
    unmountDom()
  })
  it('should not disconnect a socket that was already cleared', () => {
    WebSockets.socket = undefined
    disconnect()
    expect(fakeDisconnect.mock.calls.length).toBe(0)
  })
  it('should disconnect with socket', () => {
    disconnect()
    expect(fakeDisconnect.mock.calls.length).toBe(1)
  })
  it('should clear launchId with socket', () => {
    WebSockets.launchId = 42
    disconnect()
    expect(WebSockets.launchId).toBe(undefined)
  })
  it('should clear launchId without socket', () => {
    WebSockets.socket = undefined
    WebSockets.launchId = 42
    disconnect()
    expect(WebSockets.launchId).toBe(undefined)
  })
  it('should clear locationAssign with socket', () => {
    WebSockets.locationAssign = voidFn()
    disconnect()
    expect(WebSockets.locationAssign).toBe(Internals.uninitializedLocationAssign)
  })
  it('should clear locationAssign without socket', () => {
    WebSockets.socket = undefined
    WebSockets.locationAssign = voidFn()
    disconnect()
    expect(WebSockets.locationAssign).toBe(Internals.uninitializedLocationAssign)
  })
  it('should clear locationReload with socket', () => {
    WebSockets.locationReload = voidFn()
    disconnect()
    expect(WebSockets.locationReload).toBe(Internals.uninitializedLocationReload)
  })
  it('should clear locationReload without socket', () => {
    WebSockets.socket = undefined
    WebSockets.locationReload = voidFn()
    disconnect()
    expect(WebSockets.locationReload).toBe(Internals.uninitializedLocationReload)
  })
})
