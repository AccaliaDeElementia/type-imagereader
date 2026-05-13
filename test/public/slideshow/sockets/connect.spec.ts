'use sanity'

import {
  connect,
  disconnect,
  Imports,
  Internals,
  WebSockets,
  type WebSocket,
} from '#public/scripts/slideshow/sockets.js'
import { cast } from '#testutils/typeGuards.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

describe('public/slideshow/sockets connect()', () => {
  const fakeEmit = vi.fn()
  const fakeOn = vi.fn()
  const fakeSocket = cast<WebSocket>({ emit: fakeEmit, on: fakeOn, disconnect: vi.fn() })
  let fakeParseRoom: MockInstance | undefined = undefined
  let fakeIO: MockInstance | undefined = undefined
  let fakeAddEventListener: MockInstance | undefined = undefined
  let fakeHandleClick: MockInstance | undefined = undefined
  let fakeHandleKeys: MockInstance | undefined = undefined
  const fakeViewport = { scale: 1 }
  const dom = new JSDOM('<html></html>')
  beforeEach(() => {
    fakeViewport.scale = 1
    fakeEmit.mockClear()
    fakeOn.mockClear()
    fakeHandleClick = vi.spyOn(Internals, 'handleClick').mockImplementation((..._args: unknown[]) => undefined)
    fakeHandleKeys = vi.spyOn(Internals, 'handleKeys').mockImplementation((..._args: unknown[]) => undefined)
    fakeParseRoom = vi.spyOn(Internals, 'parseRoomName').mockReturnValue('')
    fakeIO = vi.spyOn(Imports, 'io').mockReturnValue(fakeSocket)
    mountDom(dom)
    fakeAddEventListener = vi
      .spyOn(dom.window.document.body, 'addEventListener')
      .mockImplementation((..._args: unknown[]) => undefined)
    dom.reconfigure({
      url: `http://127.0.0.1:2999/slideshow?`,
    })
    disconnect()
    global.window.visualViewport = cast<VisualViewport>(fakeViewport)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should clear launchId prior to connect succeeding', () => {
    WebSockets.launchId = 'BAD PRIOR ID'
    connect()
    expect(WebSockets.launchId).toBe(undefined)
  })
  it('should store location.assign as a function for later use', () => {
    connect()
    expect(WebSockets.locationAssign).toBeTypeOf('function')
  })
  it('should store location.assign bound for later use', () => {
    connect()
    // Function.prototype.bind is spec'd (ECMA-262 §19.2.3.2) to set .name to
    // 'bound <target>', so this assertion is stable across spec-conformant
    // runtimes. Direct behavioral testing (stub window.location.assign,
    // invoke locationAssign, assert call) is not viable — JSDOM marks
    // Location.prototype.assign as non-configurable/non-writable, blocking
    // both sinon.stub and Object.defineProperty.
    expect(WebSockets.locationAssign.name).toBe('bound assign')
  })
  it('should store location.reload as a function for later use', () => {
    connect()
    expect(WebSockets.locationReload).toBeTypeOf('function')
  })
  it('should store location.reload bound for later use', () => {
    connect()
    // See locationAssign's .name assertion above for rationale.
    expect(WebSockets.locationReload.name).toBe('bound reload')
  })
  it('should construct socket.io client', () => {
    connect()
    expect(fakeIO?.mock.calls.length).toBe(1)
  })
  const uris: Array<[string, string]> = [
    ['http://127.0.0.1:6712/foo/bar/baz', 'http://127.0.0.1:6712'],
    ['https://localhost:8443/foo/bar/baz', 'https://localhost:8443'],
    ['http://comicreader.example.org/foo/bar/baz', 'http://comicreader.example.org'],
    ['https://comicreader.example.org/foo/bar/baz', 'https://comicreader.example.org'],
  ]
  uris.forEach(([url, result]) => {
    it(`should construct socket.io clinet for: ${url}`, () => {
      dom.reconfigure({ url })
      connect()
      expect(fakeIO?.mock.calls[0]).toEqual([result])
    })
  })
  it('should save socket for later use', () => {
    connect()
    expect(WebSockets.socket).toBe(fakeSocket)
  })
  it('should listen for connect message', () => {
    connect()
    expect(fakeOn).toHaveBeenCalledWith('connect', expect.anything())
  })
  it('should provide function as callback for  connect message', () => {
    connect()
    const fn = cast<() => void>(fakeOn.mock.calls.find((c) => c[0] === 'connect')?.[1])
    expect(fn).toBeInstanceOf(Function)
  })
  it('should emit join-slideshow when connected', () => {
    connect()
    cast<() => void>(fakeOn.mock.calls.find((c) => c[0] === 'connect')?.[1])()
    expect(fakeEmit).toHaveBeenCalledWith('join-slideshow', expect.anything())
  })
  it('should join slideshow room as expected', () => {
    fakeParseRoom?.mockReturnValue('Fake Room Is Fake')
    connect()
    cast<() => void>(fakeOn.mock.calls.find((c) => c[0] === 'connect')?.[1])()
    const call = fakeEmit.mock.calls.find((c) => c[0] === 'join-slideshow')
    expect(call?.[1]).toBe('Fake Room Is Fake')
  })
  it('should emit get-launchId when connected', () => {
    connect()
    cast<() => void>(fakeOn.mock.calls.find((c) => c[0] === 'connect')?.[1])()
    expect(fakeEmit).toHaveBeenCalledWith('get-launchId', expect.anything())
  })
  it('should handle callback from get-launchId with Internals.handleGetLaunchId', () => {
    connect()
    cast<() => void>(fakeOn.mock.calls.find((c) => c[0] === 'connect')?.[1])()
    const call = fakeEmit.mock.calls.find((c) => c[0] === 'get-launchId')
    expect(call?.[1]).toBe(Internals.handleGetLaunchId)
  })
  it('should listen for image-changed message', () => {
    connect()
    expect(fakeOn).toHaveBeenCalledWith('image-changed', expect.anything())
  })
  it('should handle image-changed message with Internals.showBackingImageByType()', () => {
    connect()
    const call = fakeOn.mock.calls.find((c) => c[0] === 'image-changed')
    assert(call !== undefined)
    expect(call[1]).toBe(Internals.showBackingImageByType)
  })
  it('should add a document level onclick event handler', () => {
    connect()
    expect(fakeAddEventListener).toHaveBeenCalledWith('click', expect.anything())
  })
  it('should provide event listener for click event', () => {
    connect()
    const fn = cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'click')?.[1])
    expect(fn).toBeInstanceOf(Function)
  })
  it('should call Internals.handleClick when processing click event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'click')?.[1])(undefined)
    expect(fakeHandleClick?.mock.calls.length).toBe(1)
  })
  it('should pass event to handler when processing click event', () => {
    connect()
    const evt = { a: Math.random() }
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'click')?.[1])(evt)
    expect(fakeHandleClick?.mock.calls[0]?.[0]).toBe(evt)
  })
  it('should pass socket to handler when processing click event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'click')?.[1])(undefined)
    expect(fakeHandleClick?.mock.calls[0]?.[1]).toBe(fakeSocket)
  })
  it('should pass inisial scale factor to handler when processing click event', () => {
    fakeViewport.scale = 1.2373
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'click')?.[1])(undefined)
    expect(fakeHandleClick?.mock.calls[0]?.[2]).toBe(1.2373)
  })
  it('should pass original sale factor even if changed when processing click event', () => {
    fakeViewport.scale = 0.63
    connect()
    fakeViewport.scale = 99.72
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'click')?.[1])(undefined)
    expect(fakeHandleClick?.mock.calls[0]?.[2]).toBe(0.63)
  })
  it('should pass default scale factor when no fiewport defined for processing click event', () => {
    global.window.visualViewport = null
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'click')?.[1])(undefined)
    expect(fakeHandleClick?.mock.calls[0]?.[2]).toBe(1)
  })
  it('should add a document level onkeyup event handler', () => {
    connect()
    expect(fakeAddEventListener).toHaveBeenCalledWith('keyup', expect.anything())
  })
  it('should provide event listener for keyup event', () => {
    connect()
    const fn = cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'keyup')?.[1])
    expect(fn).toBeInstanceOf(Function)
  })
  it('should call Internals.handleKeys when processing keyup event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'keyup')?.[1])(undefined)
    expect(fakeHandleKeys?.mock.calls.length).toBe(1)
  })
  it('should pass event to handler when processing keyup event', () => {
    connect()
    const evt = { a: Math.random() }
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'keyup')?.[1])(evt)
    expect(fakeHandleKeys?.mock.calls[0]?.[0]).toBe(evt)
  })
  it('should pass socket to handler when processing keyup event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.mock.calls.find((c) => c[0] === 'keyup')?.[1])(undefined)
    expect(fakeHandleKeys?.mock.calls[0]?.[1]).toBe(fakeSocket)
  })
})
