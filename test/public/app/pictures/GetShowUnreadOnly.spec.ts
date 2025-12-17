'use sanity'

import { expect } from 'chai'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pictures function GetShowUnreadOnly()', () => {
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
  it('should return false when stored value is not set', () => {
    dom.window.localStorage.removeItem('ShowUnseenOnly')
    expect(Pictures.GetShowUnreadOnly()).to.equal(false)
  })
  it('should return false when stored value is invalid value', () => {
    dom.window.localStorage.setItem('ShowUnseenOnly', 'TRUE')
    expect(Pictures.GetShowUnreadOnly()).to.equal(false)
  })
  it('should return false when stored value is set false', () => {
    dom.window.localStorage.setItem('ShowUnseenOnly', 'false')
    expect(Pictures.GetShowUnreadOnly()).to.equal(false)
  })
  it('should return true when stored value is set true', () => {
    dom.window.localStorage.setItem('ShowUnseenOnly', 'true')
    expect(Pictures.GetShowUnreadOnly()).to.equal(true)
  })
})
