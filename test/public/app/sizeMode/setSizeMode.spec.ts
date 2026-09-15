'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals, SIZE_MODES } from '#public/scripts/app/sizeMode.js'

describe('public/app/sizeMode setSizeMode()', () => {
  let dom = new JSDOM('<html></html>')
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    unmountDom()
  })
  SIZE_MODES.forEach((mode) => {
    it(`should store ${mode}`, () => {
      Internals.setSizeMode(mode)
      expect(dom.window.localStorage.getItem('SizeMode')).toBe(mode)
    })
  })
})
