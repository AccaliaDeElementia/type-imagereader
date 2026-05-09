'use sanity'

import Sinon from 'sinon'
import {
  Connect,
  Disconnect,
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

describe('public/slideshow/sockets HandleKeys()', () => {
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
    fakeHandleClick = sandbox.stub(Internals, 'HandleClick')
    fakeHandleKeys = sandbox.stub(Internals, 'HandleKeys')
    fakeParseRoom = sandbox.stub(Internals, 'ParseRoomName')
    fakeParseRoom.returns('')
    fakeIO = sandbox.stub(Imports, 'io').returns(fakeSocket)
    mountDom(dom)
    fakeAddEventListener = sandbox.stub(dom.window.document.body, 'addEventListener')
    dom.reconfigure({
      url: `http://127.0.0.1:2999/slideshow?`,
    })
    Disconnect()
    global.window.visualViewport = cast<VisualViewport>(fakeViewport)
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should clear launchId prior to connect succeeding', () => {
    WebSockets.launchId = 'BAD PRIOR ID'
    Connect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should store location.assign as a function for later use', () => {
    Connect()
    expect(WebSockets.LocationAssign).to.be.an('function')
  })
  it('should store location.assign bound for later use', () => {
    Connect()
    //TODO: find a better way to assert this... this seems fragile
    expect(WebSockets.LocationAssign.name).to.equal('bound assign')
  })
  it('should store location.reload as a function for later use', () => {
    Connect()
    expect(WebSockets.LocationReload).to.be.an('function')
  })
  it('should store location.reload bound for later use', () => {
    Connect()
    //TODO: find a better way to assert this... this seems fragile
    expect(WebSockets.LocationReload.name).to.equal('bound reload')
  })
  it('should construct socket.io client', () => {
    Connect()
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
      Connect()
      expect(fakeIO?.firstCall.args).to.deep.equal([result])
    })
  })
  it('should save socket for later use', () => {
    Connect()
    expect(WebSockets.socket).to.equal(fakeSocket)
  })
  it('should listen for connect message', () => {
    Connect()
    expect(fakeOn.calledWith('connect')).to.equal(true)
  })
  it('should provide function as callback for  connect message', () => {
    Connect()
    const fn = cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should emit join-slideshow when connected', () => {
    Connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    expect(fakeEmit.calledWith('join-slideshow')).to.equal(true)
  })
  it('should join slideshow room as expected', () => {
    fakeParseRoom?.returns('Fake Room Is Fake')
    Connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    const call = fakeEmit.getCalls().find((c) => c.args[0] === 'join-slideshow')
    expect(call?.args[1]).to.equal('Fake Room Is Fake')
  })
  it('should emit get-launchId when connected', () => {
    Connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    expect(fakeEmit.calledWith('get-launchId')).to.equal(true)
  })
  it('should handle callback from get-launchId with Internals.HandleGetLaunchId', () => {
    Connect()
    cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    const call = fakeEmit.getCalls().find((c) => c.args[0] === 'get-launchId')
    expect(call?.args[1]).to.equal(Internals.HandleGetLaunchId)
  })
  it('should listen for image-changed message', () => {
    Connect()
    expect(fakeOn.calledWith('image-changed')).to.equal(true)
  })
  it('should handle image-changed message with Internals.ShowBackingImageByType()', () => {
    Connect()
    const call = fakeOn.getCalls().find((c) => c.args[0] === 'image-changed')
    assert(call !== undefined)
    expect(call.args[1]).to.equal(Internals.ShowBackingImageByType)
  })
  it('should add a document level onclick event handler', () => {
    Connect()
    expect(fakeAddEventListener?.calledWith('click')).to.equal(true)
  })
  it('should provide event listener for click event', () => {
    Connect()
    const fn = cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should call Internals.HandleClick when processing click event', () => {
    Connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.callCount).to.equal(1)
  })
  it('should pass event to handler when processing click event', () => {
    Connect()
    const evt = { a: Math.random() }
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(evt)
    expect(fakeHandleClick?.firstCall.args[0]).to.equal(evt)
  })
  it('should pass socket to handler when processing click event', () => {
    Connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[1]).to.equal(fakeSocket)
  })
  it('should pass inisial scale factor to handler when processing click event', () => {
    fakeViewport.scale = 1.2373
    Connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(1.2373)
  })
  it('should pass original sale factor even if changed when processing click event', () => {
    fakeViewport.scale = 0.63
    Connect()
    fakeViewport.scale = 99.72
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(0.63)
  })
  it('should pass default scale factor when no fiewport defined for processing click event', () => {
    global.window.visualViewport = null
    Connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(1)
  })
  it('should add a document level onkeyup event handler', () => {
    Connect()
    expect(fakeAddEventListener?.calledWith('keyup')).to.equal(true)
  })
  it('should provide event listener for keyup event', () => {
    Connect()
    const fn = cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should call Internals.HandleKeys when processing keyup event', () => {
    Connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(undefined)
    expect(fakeHandleKeys?.callCount).to.equal(1)
  })
  it('should pass event to handler when processing keyup event', () => {
    Connect()
    const evt = { a: Math.random() }
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(evt)
    expect(fakeHandleKeys?.firstCall.args[0]).to.equal(evt)
  })
  it('should pass socket to handler when processing keyup event', () => {
    Connect()
    cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(undefined)
    expect(fakeHandleKeys?.firstCall.args[1]).to.equal(fakeSocket)
  })
})
