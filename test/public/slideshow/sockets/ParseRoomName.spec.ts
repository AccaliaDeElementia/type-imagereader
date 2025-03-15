'use sanity'

import { Functions } from '../../../../public/scripts/slideshow/sockets'
import { after, before, describe, it } from 'mocha'
import { Cast } from '../../../testutils/TypeGuards'
import { JSDOM } from 'jsdom'
import { expect } from 'chai'

describe('public/slideshow/sockets ParseRoomName()', () => {
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
  const testCases: Array<[string, string]> = [
    ['', '/'],
    ['/', '/'],
    ['/foo', '/'],
    ['/foo/%2f', '//'],
    ['/slideshow/foo', '/foo'],
    ['/slideshow/foo?kiosk', '/foo'],
    ['/bar/baz/quux/flip', '/baz/quux/flip'],
  ]
  testCases.forEach(([path, result]) => {
    it(`should correctly parse: ${path}`, () => {
      dom.reconfigure({
        url: `https://localhost:2999${path}`,
      })
      expect(Functions.ParseRoomName()).to.equal(result)
    })
  })
})
