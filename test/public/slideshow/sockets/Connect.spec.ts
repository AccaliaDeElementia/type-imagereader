'use sanity'

import Sinon from 'sinon'
import {
  connect,
  disconnect,
  Imports,
  Internals,
  WebSockets,
  type WebSocket,
} from '#public/scripts/slideshow/sockets.js'
import { cast } from '#testutils/TypeGuards.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { expect } from 'chai'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/sockets handleKeys()', () => {
  const fakeEmit = sandbox.stub()
  const fakeOn = sandbox.stub()
  const fakeSocket = cast<WebSocket>({ emit: fakeEmit, on: fakeOn, disconnect: Sinon.spy() })
  let fakeParseRoom: Sinon.SinonStub | undefined = undefined
  let fakeIO: Sinon.SinonStub | undefined = undefined
  let fakeAddEventListener: Sinon.SinonStub | undefined = undefined
  let fakeHandleClick: Sinon.SinonStub | undefined = undefined
  let fakeHandleKeys: Sinon.SinonStub | undefined = undefined
  const fakeViewport = { scale: 1 }
  const dom = new JSDOM('<html></html>')
  beforeEach(() => {
    fakeViewport.scale = 1
    fakeEmit.reset()
    fakeOn.reset()
    fakeHandleClick = sandbox.stub(Internals, 'handleClick')
    fakeHandleKeys = sandbox.stub(Internals, 'handleKeys')
    fakeParseRoom = sandbox.stub(Internals, 'parseRoomName')
    fakeParseRoom.returns('')
    fakeIO = sandbox.stub(Imports, 'io').returns(fakeSocket)
    mountDom(dom)
    fakeAddEventListener = sandbox.stub(dom.window.document.body, 'addEventListener')
    dom.reconfigure({
      url: `http://127.0.0.1:2999/slideshow?`,
    })
    disconnect()
    global.window.visualViewport = cast<VisualViewport>(fakeViewport)
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should clear launchId prior to connect succeeding', () => {
    WebSockets.launchId = 'BAD PRIOR ID'
    connect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should store location.assign as a function for later use', () => {
    connect()
    expect(WebSockets.locationAssign).to.be.an('function')
  })
  it('should store location.assign bound for later use', () => {
    connect()
    //TODO: find a better way to assert this... this seems fragile
    expect(WebSockets.locationAssign.name).to.equal('bound assign')
  })
  it('should store location.reload as a function for later use', () => {
    connect()
    expect(WebSockets.locationReload).to.be.an('function')
  })
  it('should store location.reload bound for later use', () => {
    connect()
    //TODO: find a better way to assert this... this seems fragile
    expect(WebSockets.locationReload.name).to.equal('bound reload')
  })
  it('should construct socket.io client', () => {
    connect()
    expect(fakeIO?.callCount).to.equal(1)
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
      expect(fakeIO?.firstCall.args).to.deep.equal([result])
    })
  })
  it('should save socket for later use', () => {
    connect()
    expect(WebSockets.socket).to.equal(fakeSocket)
  })
  it('should listen for connect message', () => {
    connect()
    expect(fakeOn.calledWith('connect')).to.equal(true)
  })
  it('should provide function as callback for  connect message', () => {
    connect()
    const fn = cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should emit join-slideshow when connected', () => {
    connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    expect(fakeEmit.calledWith('join-slideshow')).to.equal(true)
  })
  it('should join slideshow room as expected', () => {
    fakeParseRoom?.returns('Fake Room Is Fake')
    connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    const call = fakeEmit.getCalls().find((c) => c.args[0] === 'join-slideshow')
    expect(call?.args[1]).to.equal('Fake Room Is Fake')
  })
  it('should emit get-launchId when connected', () => {
    connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    expect(fakeEmit.calledWith('get-launchId')).to.equal(true)
  })
  it('should handle callback from get-launchId with Internals.handleGetLaunchId', () => {
    connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    const call = fakeEmit.getCalls().find((c) => c.args[0] === 'get-launchId')
    expect(call?.args[1]).to.equal(Internals.handleGetLaunchId)
  })
  it('should listen for image-changed message', () => {
    connect()
    expect(fakeOn.calledWith('image-changed')).to.equal(true)
  })
  it('should handle image-changed message with Internals.showBackingImageByType()', () => {
    connect()
    const call = fakeOn.getCalls().find((c) => c.args[0] === 'image-changed')
    assert(call !== undefined)
    expect(call.args[1]).to.equal(Internals.showBackingImageByType)
  })
  it('should add a document level onclick event handler', () => {
    connect()
    expect(fakeAddEventListener?.calledWith('click')).to.equal(true)
  })
  it('should provide event listener for click event', () => {
    connect()
    const fn = cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should call Internals.handleClick when processing click event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.callCount).to.equal(1)
  })
  it('should pass event to handler when processing click event', () => {
    connect()
    const evt = { a: Math.random() }
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(evt)
    expect(fakeHandleClick?.firstCall.args[0]).to.equal(evt)
  })
  it('should pass socket to handler when processing click event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[1]).to.equal(fakeSocket)
  })
  it('should pass inisial scale factor to handler when processing click event', () => {
    fakeViewport.scale = 1.2373
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(1.2373)
  })
  it('should pass original sale factor even if changed when processing click event', () => {
    fakeViewport.scale = 0.63
    connect()
    fakeViewport.scale = 99.72
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(0.63)
  })
  it('should pass default scale factor when no fiewport defined for processing click event', () => {
    global.window.visualViewport = null
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(1)
  })
  it('should add a document level onkeyup event handler', () => {
    connect()
    expect(fakeAddEventListener?.calledWith('keyup')).to.equal(true)
  })
  it('should provide event listener for keyup event', () => {
    connect()
    const fn = cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should call Internals.handleKeys when processing keyup event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(undefined)
    expect(fakeHandleKeys?.callCount).to.equal(1)
  })
  it('should pass event to handler when processing keyup event', () => {
    connect()
    const evt = { a: Math.random() }
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(evt)
    expect(fakeHandleKeys?.firstCall.args[0]).to.equal(evt)
  })
  it('should pass socket to handler when processing keyup event', () => {
    connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(undefined)
    expect(fakeHandleKeys?.firstCall.args[1]).to.equal(fakeSocket)
  })
})
