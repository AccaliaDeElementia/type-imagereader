'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pictures function GetCurrentPage()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    Pictures.mainImage = null
    Pictures.imageCard = null
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  const makePages = (count: number): HTMLDivElement[] => {
    const result = []
    const pages = dom.window.document.createElement('div')
    pages.classList.add('pagination')
    for (let i = 1; i <= count; i++) {
      const page = dom.window.document.createElement('div')
      page.classList.add('page-item')
      pages.appendChild(page)
      result.push(page)
    }
    dom.window.document.querySelector('body')?.appendChild(pages)
    return result
  }
  it('should return -1 for no pages', () => {
    makePages(0)
    expect(Pictures.GetCurrentPage()).to.equal(-1)
  })
  it('should return -1 for no active pages', () => {
    makePages(20)
    expect(Pictures.GetCurrentPage()).to.equal(-1)
  })
  it('should return number for active page', () => {
    const pages = makePages(20)
    pages[10]?.classList.add('active')
    expect(Pictures.GetCurrentPage()).to.equal(10)
  })
  it('should return number for first active page', () => {
    const pages = makePages(20)
    pages[10]?.classList.add('active')
    pages[15]?.classList.add('active')
    expect(Pictures.GetCurrentPage()).to.equal(10)
  })
})
