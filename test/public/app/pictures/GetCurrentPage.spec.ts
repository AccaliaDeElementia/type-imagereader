'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Grid } from '#public/scripts/app/pictures/grid.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures function GetCurrentPage()', () => {
  let dom = new JSDOM('<html></html>', {})
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Pictures.mainImage = null
    Pictures.imageCard = null
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  const makePages = (count: number): HTMLDivElement[] => {
    const result = []
    const pages = dom.window.document.createElement('div')
    pages.classList.add('pagination')
    for (let i = 1; i <= count; i += 1) {
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
    expect(Grid.GetCurrentPage()).to.equal(-1)
  })
  it('should return -1 for no active pages', () => {
    makePages(20)
    expect(Grid.GetCurrentPage()).to.equal(-1)
  })
  it('should return number for active page', () => {
    const pages = makePages(20)
    pages[10]?.classList.add('active')
    expect(Grid.GetCurrentPage()).to.equal(10)
  })
  it('should return number for first active page', () => {
    const pages = makePages(20)
    pages[10]?.classList.add('active')
    pages[15]?.classList.add('active')
    expect(Grid.GetCurrentPage()).to.equal(10)
  })
})
