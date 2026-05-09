'use sanity'

import { expect } from 'chai'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { getShowUnreadOnly } from '#public/scripts/app/pictures/unreadFilter.js'

describe('public/app/pictures getShowUnreadOnly()', () => {
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
    dom.window.localStorage.removeItem('ShowUnreadOnly')
    expect(getShowUnreadOnly()).to.equal(false)
  })
  it('should return false when stored value is invalid value', () => {
    dom.window.localStorage.setItem('ShowUnreadOnly', 'TRUE')
    expect(getShowUnreadOnly()).to.equal(false)
  })
  it('should return false when stored value is set false', () => {
    dom.window.localStorage.setItem('ShowUnreadOnly', 'false')
    expect(getShowUnreadOnly()).to.equal(false)
  })
  it('should return true when stored value is set true', () => {
    dom.window.localStorage.setItem('ShowUnreadOnly', 'true')
    expect(getShowUnreadOnly()).to.equal(true)
  })
})
