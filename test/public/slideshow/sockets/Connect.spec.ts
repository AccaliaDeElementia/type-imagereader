'use sanity'

import Sinon from 'sinon'
import { Imports, Functions, WebSockets, type WebSocket } from '../../../../public/scripts/slideshow/sockets'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'
import { expect } from 'chai'
import assert from 'assert'

describe('public/slideshow/sockets HandleKeys()', () => {
  const fakeEmit = Sinon.stub()
  const fakeOn = Sinon.stub()
  const fakeSocket = Cast<WebSocket>({ emit: fakeEmit, on: fakeOn, disconnect: Sinon.spy() })
  let fakeParseRoom: Sinon.SinonStub | undefined = undefined
  let fakeIO: Sinon.SinonStub | undefined = undefined
  let fakeAddEventListener: Sinon.SinonStub | undefined = undefined
  let fakeHandleClick: Sinon.SinonStub | undefined = undefined
  let fakeHandleKeys: Sinon.SinonStub | undefined = undefined
  const fakeViewport = { scale: 1 }
  const existingWindow = global.window
  const existingDocument = global.document
  const dom = new JSDOM('<html></html>')
  beforeEach(() => {
    fakeViewport.scale = 1
    fakeEmit.reset()
    fakeOn.reset()
    fakeHandleClick = Sinon.stub(Functions, 'HandleClick')
    fakeHandleKeys = Sinon.stub(Functions, 'HandleKeys')
    fakeParseRoom = Sinon.stub(Functions, 'ParseRoomName')
    fakeParseRoom.returns('')
    fakeIO = Sinon.stub(Imports, 'io').returns(fakeSocket)
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
    fakeAddEventListener = Sinon.stub(dom.window.document.body, 'addEventListener')
    dom.reconfigure({
      url: `http://127.0.0.1:2999/slideshow?`,
    })
    WebSockets.disconnect()
    global.window.visualViewport = Cast<VisualViewport>(fakeViewport)
  })
  afterEach(() => {
    fakeHandleClick?.restore()
    fakeHandleKeys?.restore()
    fakeIO?.restore()
    fakeParseRoom?.restore()
    fakeAddEventListener?.restore()
    global.window = existingWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => existingDocument,
    })
  })
  after(() => {
    Sinon.restore()
  })
  it('should clear launchId prior to connect succeeding', () => {
    WebSockets.launchId = 'BAD PRIOR ID'
    WebSockets.connect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should store location.assign bound for later use', () => {
    WebSockets.connect()
    //TODO: find a better way to assert this... this seems fragile
    expect(WebSockets.LocationAssign).to.be.an('function')
    expect(WebSockets.LocationAssign.name).to.equal('bound assign')
  })
  it('should store location.reload bound for later use', () => {
    WebSockets.connect()
    //TODO: find a better way to assert this... this seems fragile
    expect(WebSockets.LocationReload).to.be.an('function')
    expect(WebSockets.LocationReload.name).to.equal('bound reload')
  })
  it('should construct socket.io client', () => {
    WebSockets.connect()
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
      WebSockets.connect()
      expect(fakeIO?.firstCall.args).to.deep.equal([result])
    })
  })
  it('should save socket for later use', () => {
    WebSockets.connect()
    expect(WebSockets.socket).to.equal(fakeSocket)
  })
  it('should listen for connect message', () => {
    WebSockets.connect()
    expect(fakeOn.calledWith('connect')).to.equal(true)
  })
  it('should provide function as callback for  connect message', () => {
    WebSockets.connect()
    const fn = Cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should emit join-slideshow when connected', () => {
    WebSockets.connect()
    Cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    expect(fakeEmit.calledWith('join-slideshow')).to.equal(true)
  })
  it('should join slideshow room as expected', () => {
    fakeParseRoom?.returns('Fake Room Is Fake')
    WebSockets.connect()
    Cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    const call = fakeEmit.getCalls().find((c) => c.args[0] === 'join-slideshow')
    expect(call?.args[1]).to.equal('Fake Room Is Fake')
  })
  it('should emit get-launchId when connected', () => {
    WebSockets.connect()
    Cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    expect(fakeEmit.calledWith('get-launchId')).to.equal(true)
  })
  it('should handle callback from get-launchId with Functions.HandleGetLaunchId', () => {
    WebSockets.connect()
    Cast<() => void>(fakeOn.getCalls().find((c) => c.args[0] === 'connect')?.args[1])()
    const call = fakeEmit.getCalls().find((c) => c.args[0] === 'get-launchId')
    expect(call?.args[1]).to.equal(Functions.HandleGetLaunchId)
  })
  it('should listen for new-image message', () => {
    WebSockets.connect()
    expect(fakeOn.calledWith('new-image')).to.equal(true)
  })
  it('should handle new-image message with Functions.DoNewImage()', () => {
    WebSockets.connect()
    const call = fakeOn.getCalls().find((c) => c.args[0] === 'new-image')
    assert(call != null)
    expect(call.args[1]).to.equal(Functions.DoNewImage)
  })
  it('should add a document level onclick event handler', () => {
    WebSockets.connect()
    expect(fakeAddEventListener?.calledWith('click')).to.equal(true)
  })
  it('should provide event listener for click event', () => {
    WebSockets.connect()
    const fn = Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should call Functions.HandleClick when processing click event', () => {
    WebSockets.connect()
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.callCount).to.equal(1)
  })
  it('should pass event to handler when processing click event', () => {
    WebSockets.connect()
    const evt = { a: Math.random() }
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(evt)
    expect(fakeHandleClick?.firstCall.args[0]).to.equal(evt)
  })
  it('should pass socket to handler when processing click event', () => {
    WebSockets.connect()
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[1]).to.equal(fakeSocket)
  })
  it('should pass inisial scale factor to handler when processing click event', () => {
    fakeViewport.scale = 1.2373
    WebSockets.connect()
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(1.2373)
  })
  it('should pass original sale factor even if changed when processing click event', () => {
    fakeViewport.scale = 0.63
    WebSockets.connect()
    fakeViewport.scale = 99.72
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(0.63)
  })
  it('should pass default scale factor when no fiewport defined for processing click event', () => {
    global.window.visualViewport = null
    WebSockets.connect()
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'click')?.args[1])(undefined)
    expect(fakeHandleClick?.firstCall.args[2]).to.equal(1)
  })
  it('should add a document level onkeyup event handler', () => {
    WebSockets.connect()
    expect(fakeAddEventListener?.calledWith('keyup')).to.equal(true)
  })
  it('should provide event listener for keyup event', () => {
    WebSockets.connect()
    const fn = Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])
    expect(fn).to.be.an.instanceOf(Function)
  })
  it('should call Functions.HandleKeys when processing keyup event', () => {
    WebSockets.connect()
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(undefined)
    expect(fakeHandleKeys?.callCount).to.equal(1)
  })
  it('should pass event to handler when processing keyup event', () => {
    WebSockets.connect()
    const evt = { a: Math.random() }
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(evt)
    expect(fakeHandleKeys?.firstCall.args[0]).to.equal(evt)
  })
  it('should pass socket to handler when processing keyup event', () => {
    WebSockets.connect()
    Cast<(_: unknown) => void>(fakeAddEventListener?.getCalls().find((c) => c.args[0] === 'keyup')?.args[1])(undefined)
    expect(fakeHandleKeys?.firstCall.args[1]).to.equal(fakeSocket)
  })
})
