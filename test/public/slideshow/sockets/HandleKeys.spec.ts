'use sanity'

import Sinon from 'sinon'
import { Functions, type WebSocket } from '#public/scripts/slideshow/sockets.js'
import { after, afterEach, before, beforeEach, describe, it } from 'mocha'
import { Cast } from '#testutils/TypeGuards.js'
import { JSDOM } from 'jsdom'
import assert from 'node:assert'
import { expect } from 'chai'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/sockets HandleKeys()', () => {
  const fakeEmit = sandbox.stub()
  const fakeSocket = Cast<WebSocket>({ emit: fakeEmit })
  const existingWindow = global.window
  const existingDocument = global.document
  const dom = new JSDOM('<html></html>')
  before(() => {
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
  })
  after(() => {
    global.window = existingWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => existingDocument,
    })
  })
  beforeEach(() => {
    fakeEmit.reset()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should not break if socket is null', () => {
    const evt = new global.window.KeyboardEvent('keyup', { key: 'a' })
    Functions.HandleKeys(evt, Cast<WebSocket>(null))
    assert(true, 'should not throw when null socket provided')
  })
  it('should not break if socket is undefined', () => {
    const evt = new global.window.KeyboardEvent('keyup', { key: 'a' })
    Functions.HandleKeys(evt, undefined)
    assert(true, 'should not throw when undefined socket provided')
  })
  const ignoredKeys = ['a', 'A', 'ARROW', 'Left', 'right', 'f1', 'F23, ENTER']
  ignoredKeys.forEach((key) => {
    it(`should not emit when key is '${key}'`, () => {
      const evt = new global.window.KeyboardEvent('keyup', { key })
      Functions.HandleKeys(evt, fakeSocket)
      expect(fakeEmit.callCount).to.equal(0)
    })
  })
  const triggerKeys: Array<[string, string]> = [
    ['arrowright', 'next-image'],
    ['ARROWRIGHT', 'next-image'],
    ['aRrOwRiGhT', 'next-image'],
    ['ArRoWrIgHt', 'next-image'],
    ['arrowleft', 'prev-image'],
    ['ARROWLEFT', 'prev-image'],
    ['ArRoWlEfT', 'prev-image'],
    ['aRrOwLeFt', 'prev-image'],
  ]
  triggerKeys.forEach(([key, expected]) => {
    it(`should emit only once for key: ${key}`, () => {
      const evt = new global.window.KeyboardEvent('keyup', { key })
      Functions.HandleKeys(evt, fakeSocket)
      expect(fakeEmit.callCount).to.equal(1)
    })
    it(`should emit '${expected}' for key: ${key}`, () => {
      const evt = new global.window.KeyboardEvent('keyup', { key })
      Functions.HandleKeys(evt, fakeSocket)
      expect(fakeEmit.firstCall.args).to.deep.equal([expected])
    })
  })
})
