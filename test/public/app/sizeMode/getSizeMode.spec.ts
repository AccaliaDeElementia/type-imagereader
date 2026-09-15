'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { getSizeMode, SIZE_MODES } from '#public/scripts/app/sizeMode.js'

describe('public/app/sizeMode getSizeMode()', () => {
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
  it('should default to fitScreen when nothing is stored', () => {
    dom.window.localStorage.removeItem('SizeMode')
    expect(getSizeMode()).toBe('fitScreen')
  })
  it('should default to fitScreen when the stored value is not a mode', () => {
    dom.window.localStorage.setItem('SizeMode', 'enhance')
    expect(getSizeMode()).toBe('fitScreen')
  })
  SIZE_MODES.forEach((mode) => {
    it(`should return ${mode} when it is stored`, () => {
      dom.window.localStorage.setItem('SizeMode', mode)
      expect(getSizeMode()).toBe(mode)
    })
  })
})
