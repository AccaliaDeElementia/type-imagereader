'use sanity'

import Sinon from 'sinon'
import { Functions, WebSockets, type WebSocket } from '../../../../public/scripts/slideshow/sockets'
import { after, before, beforeEach, describe, it } from 'mocha'
import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'
import assert from 'assert'
import { expect } from 'chai'

describe('public/slideshow/sockets HandleKeys()', () => {
  const fakeEmit = Sinon.stub()
  const fakeSocket = Cast<WebSocket>({ emit: fakeEmit })
  let fakeAssign = Sinon.stub()
  const fakeViewport = { scale: 1 }
  const existingWindow = global.window
  const existingDocument = global.document
  const dom = new JSDOM('<html></html>')
  before(() => {
    fakeAssign = Sinon.stub(WebSockets, 'LocationAssign')
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
    global.window.visualViewport = Cast<VisualViewport>(fakeViewport)
  })
  after(() => {
    fakeAssign.restore()
    global.window = existingWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => existingDocument,
    })
  })
  beforeEach(() => {
    fakeViewport.scale = 1
    fakeEmit.reset()
    fakeAssign.reset()
    dom.reconfigure({
      url: `http://127.0.0.1:2999/slideshow?`,
    })
  })
  it('should not break if socket is null', () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (1 / 6),
      clientY: global.window.innerHeight / 2,
    })
    Functions.HandleClick(event, Cast<WebSocket>(null), 1)
    assert(true, 'should not throw when null socket provided')
  })
  it('should not break if socket is undefined', () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (1 / 6),
      clientY: global.window.innerHeight / 2,
    })
    Functions.HandleClick(event, undefined, 1)
    assert(true, 'should not throw when undefined socket provided')
  })
  const emitCases: Array<[string, number, number, string]> = [
    ['', 0, 0, 'prev-image'],
    ['kiosk', 0, 0, 'prev-image'],
    ['', 0.1, 1, 'prev-image'],
    ['kiosk', 0.1, 1, 'prev-image'],
    ['', 0.2, 0.5, 'prev-image'],
    ['kiosk', 0.2, 0.5, 'prev-image'],
    ['', 0.3, 0.3, 'prev-image'],
    ['kiosk', 0.3, 0.3, 'prev-image'],
    ['', 0.32, 0.3, 'prev-image'],
    ['kiosk', 0.32, 0.3, 'prev-image'],
    ['', 0.33, 0.66, 'prev-image'],
    ['kiosk', 0.33, 0.3, 'prev-image'],
    ['', 0.34, 0.66, 'goto-image'],
    ['kiosk', 0.34, 0.3, 'next-image'],
    ['', 0.4, 0.66, 'goto-image'],
    ['kiosk', 0.4, 0.3, 'next-image'],
    ['', 0.5, 0.66, 'goto-image'],
    ['kiosk', 0.5, 0.3, 'next-image'],
    ['', 0.6, 0.66, 'goto-image'],
    ['kiosk', 0.6, 0.3, 'next-image'],
    ['', 0.66, 0.66, 'goto-image'],
    ['kiosk', 0.66, 0.3, 'next-image'],
    ['', 0.67, 0.66, 'next-image'],
    ['kiosk', 0.67, 0.3, 'next-image'],
    ['', 0.7, 0.66, 'next-image'],
    ['kiosk', 0.7, 0.3, 'next-image'],
    ['', 0.8, 0.66, 'next-image'],
    ['kiosk', 0.8, 0.3, 'next-image'],
    ['', 0.9, 0.66, 'next-image'],
    ['kiosk', 0.9, 0.3, 'next-image'],
    ['', 1, 0.66, 'next-image'],
    ['kiosk', 1, 0.3, 'next-image'],
  ]
  emitCases.forEach(([search, xPercent, yPercent, expected]) => {
    it(`should emit ${search} message when click is ${xPercent}`, () => {
      dom.reconfigure({
        url: `http://127.0.0.1:2999/slideshow?${search}`,
      })
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * xPercent,
        clientY: global.window.innerHeight * yPercent,
      })
      Functions.HandleClick(event, fakeSocket, 1)
      expect(fakeEmit.callCount).to.equal(1)
    })
    it(`should emit ${expected} ${search} message when click is ${xPercent}`, () => {
      dom.reconfigure({
        url: `http://127.0.0.1:2999/slideshow?${search}`,
      })
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * xPercent,
        clientY: global.window.innerHeight * yPercent,
      })
      Functions.HandleClick(event, fakeSocket, 1)
      expect(fakeEmit.firstCall.args[0]).to.deep.equal(expected)
    })
    it(`should ignore click at ${xPercent}:${yPercent} when zoomed out`, () => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * xPercent,
        clientY: global.window.innerHeight * yPercent,
      })
      Functions.HandleClick(event, fakeSocket, 1.001)
      expect(fakeEmit.callCount).to.equal(1)
    })
    it(`should ignore click at ${xPercent}:${yPercent} when zoomed in`, () => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * xPercent,
        clientY: global.window.innerHeight * yPercent,
      })
      Functions.HandleClick(event, fakeSocket, 0.999)
      expect(fakeEmit.callCount).to.equal(0)
    })
  })
  it(`should emit second parameter for goto-image event`, () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * 0.5,
      clientY: global.window.innerHeight * 0.5,
    })
    Functions.HandleClick(event, fakeSocket, 1)
    expect(fakeEmit.firstCall.args).to.have.lengthOf(2)
  })
  it(`should provide callback function for goto-image event`, () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * 0.5,
      clientY: global.window.innerHeight * 0.5,
    })
    Functions.HandleClick(event, fakeSocket, 1)
    expect(fakeEmit.firstCall.args[1]).to.be.an.instanceOf(Function)
  })
  it(`should call location.assign from goto-image callback`, () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * 0.5,
      clientY: global.window.innerHeight * 0.5,
    })
    Functions.HandleClick(event, fakeSocket, 1)
    const fn = Cast<(x: string) => void>(fakeEmit.firstCall.args[1])
    fn('/foo/bar/baz')
    expect(fakeAssign.callCount).to.equal(1)
  })
  it(`should assign expected uri from goto-image callback`, () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * 0.5,
      clientY: global.window.innerHeight * 0.5,
    })
    Functions.HandleClick(event, fakeSocket, 1)
    const fn = Cast<(x: string) => void>(fakeEmit.firstCall.args[1])
    fn('/foo/bar/baz')
    expect(fakeAssign.firstCall.args).to.deep.equal(['/show/foo/bar/baz?noMenu'])
  })
})
