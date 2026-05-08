'use sanity'

import { expect } from 'chai'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { Pictures } from '#public/scripts/app/pictures/index.js'

describe('public/app/pictures function SetShowUnreadOnly()', () => {
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
  it('should store true when enabling function', () => {
    Pictures.SetShowUnreadOnly(true)
    expect(dom.window.localStorage.getItem('ShowUnreadOnly')).to.equal('true')
  })
  it('should store true when disabling function', () => {
    Pictures.SetShowUnreadOnly(false)
    expect(dom.window.localStorage.getItem('ShowUnreadOnly')).to.equal('false')
  })
})
