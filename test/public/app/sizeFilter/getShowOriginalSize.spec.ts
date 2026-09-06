'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { getShowOriginalSize } from '#public/scripts/app/sizeFilter.js'

describe('public/app/pictures getShowOriginalSize()', () => {
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
  it('should return false when stored value is not set', () => {
    dom.window.localStorage.removeItem('ShowOriginalSize')
    expect(getShowOriginalSize()).toBe(false)
  })
  it('should return false when stored value is invalid value', () => {
    dom.window.localStorage.setItem('ShowOriginalSize', 'TRUE')
    expect(getShowOriginalSize()).toBe(false)
  })
  it('should return false when stored value is set false', () => {
    dom.window.localStorage.setItem('ShowOriginalSize', 'false')
    expect(getShowOriginalSize()).toBe(false)
  })
  it('should return true when stored value is set true', () => {
    dom.window.localStorage.setItem('ShowOriginalSize', 'true')
    expect(getShowOriginalSize()).toBe(true)
  })
})
