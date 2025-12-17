'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pictures function SelectPage()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  const selectPageSpy = Sinon.stub().resolves()
  const loadingErrorSpy = Sinon.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    selectPageSpy.resetHistory()
    loadingErrorSpy.resetHistory()
    PubSub.subscribers = {
      'PICTURES:SELECTPAGE': [selectPageSpy],
      'LOADING:ERROR': [loadingErrorSpy],
    }
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
  const makePageLinks = (count: number): HTMLDivElement[] => {
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
  const makePages = (count: number): HTMLDivElement[] => {
    const result = []
    const pages = dom.window.document.createElement('div')
    pages.id = 'tabImages'
    for (let i = 1; i <= count; i++) {
      const page = dom.window.document.createElement('div')
      page.classList.add('page')
      pages.appendChild(page)
      result.push(page)
    }
    dom.window.document.querySelector('body')?.appendChild(pages)
    return result
  }
  it('should publish default page select when no pages', () => {
    Pictures.SelectPage(0)
    expect(selectPageSpy.callCount).to.equal(1)
    expect(selectPageSpy.firstCall.args).to.deep.equal(['Default Page Selected', 'PICTURES:SELECTPAGE'])
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should not publish error when no pages', () => {
    // test various cases, none should error
    Pictures.SelectPage(0)
    Pictures.SelectPage(-1)
    Pictures.SelectPage(1e9)
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should publish error when trying to select zero page', () => {
    makePageLinks(10)
    makePages(10)
    Pictures.SelectPage(0)
    expect(selectPageSpy.callCount).to.equal(0)
    expect(loadingErrorSpy.callCount).to.equal(1)
    expect(loadingErrorSpy.firstCall.args).to.deep.equal(['Invalid Page Index Selected', 'LOADING:ERROR'])
  })
  it('should publish error when trying to select negative page', () => {
    makePageLinks(10)
    makePages(10)
    Pictures.SelectPage(-1)
    expect(selectPageSpy.callCount).to.equal(0)
    expect(loadingErrorSpy.callCount).to.equal(1)
    expect(loadingErrorSpy.firstCall.args).to.deep.equal(['Invalid Page Index Selected', 'LOADING:ERROR'])
  })
  it('should publish error when trying to select out of range page', () => {
    makePageLinks(10)
    makePages(10)
    Pictures.SelectPage(11)
    expect(selectPageSpy.callCount).to.equal(0)
    expect(loadingErrorSpy.callCount).to.equal(1)
    expect(loadingErrorSpy.firstCall.args).to.deep.equal(['Invalid Page Index Selected', 'LOADING:ERROR'])
  })
  it('should not publish error when trying to select valid page', () => {
    makePageLinks(10)
    makePages(10)
    Pictures.SelectPage(5)
    expect(selectPageSpy.callCount).to.equal(1)
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should remove active class from current active page link when switching', () => {
    const links = makePageLinks(100)
    makePages(100)
    links[50]?.classList.add('active')
    expect(links[50]?.classList.contains('active')).to.equal(true)
    Pictures.SelectPage(25)
    expect(links[50]?.classList.contains('active')).to.equal(false)
  })
  it('should add active class to next page link when switching', () => {
    const links = makePageLinks(100)
    makePages(100)
    links[50]?.classList.add('active')
    expect(links[25]?.classList.contains('active')).to.equal(false)
    Pictures.SelectPage(25)
    expect(links[25]?.classList.contains('active')).to.equal(true)
  })
  it('should add hidden class to active page when switching', () => {
    makePageLinks(100)
    const pages = makePages(100)
    pages[50]?.classList.remove('hidden')
    expect(pages[50]?.classList.contains('hidden')).to.equal(false)
    Pictures.SelectPage(25)
    expect(pages[50]?.classList.contains('hidden')).to.equal(true)
  })
  it('should remove hidden class from next page when switching', () => {
    makePageLinks(100)
    const pages = makePages(100)
    pages[24]?.classList.add('hidden')
    expect(pages[24]?.classList.contains('hidden')).to.equal(true)
    Pictures.SelectPage(25)
    expect(pages[24]?.classList.contains('hidden')).to.equal(false)
  })
  it('should publish notification on successful page select', () => {
    makePageLinks(10)
    makePages(10)
    Pictures.SelectPage(5)
    expect(selectPageSpy.callCount).to.equal(1)
    expect(selectPageSpy.firstCall.args).to.deep.equal(['New Page 5 Selected', 'PICTURES:SELECTPAGE'])
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should not publish notification on error page select', () => {
    makePageLinks(10)
    makePages(10)
    Pictures.SelectPage(50)
    expect(selectPageSpy.callCount).to.equal(0)
  })
})
