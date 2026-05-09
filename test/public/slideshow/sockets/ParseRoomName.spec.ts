'use sanity'

import { Internals } from '#public/scripts/slideshow/sockets.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { expect } from 'chai'

describe('public/slideshow/sockets ParseRoomName()', () => {
  const dom = new JSDOM('<html></html>')
  beforeAll(() => {
    mountDom(dom)
  })
  afterAll(() => {
    unmountDom()
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
      expect(Internals.ParseRoomName()).to.equal(result)
    })
  })
})
