'use sanity'

import { expect } from 'chai'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pictures function SetShowUnreadOnly()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>')
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should store true when enabling function', () => {
    Pictures.SetShowUnreadOnly(true)
    expect(dom.window.localStorage.getItem('ShowUnseenOnly')).to.equal('true')
  })
  it('should store true when disabling function', () => {
    Pictures.SetShowUnreadOnly(false)
    expect(dom.window.localStorage.getItem('ShowUnseenOnly')).to.equal('false')
  })
})
