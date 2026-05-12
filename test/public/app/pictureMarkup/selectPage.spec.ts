'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Imports, selectPage } from '#public/scripts/app/pictureMarkup.js'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures selectPage()', () => {
  let dom = new JSDOM('<html></html>', {})
  let publishStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    publishStub = sandbox.stub(Imports, 'publish')
    Pictures.mainImage = null
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  const makePageLinks = (count: number): HTMLDivElement[] => {
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
  const makePages = (count: number): HTMLDivElement[] => {
    const result = []
    const pages = dom.window.document.createElement('div')
    pages.id = 'tabImages'
    for (let i = 1; i <= count; i += 1) {
      const page = dom.window.document.createElement('div')
      page.classList.add('page')
      pages.appendChild(page)
      result.push(page)
    }
    dom.window.document.querySelector('body')?.appendChild(pages)
    return result
  }
  it('should publish default page select once when no pages', () => {
    selectPage(0)
    expect(publishStub.withArgs('Pictures:selectPage').callCount).toBe(1)
  })
  it('should publish default page select with expected args when no pages', () => {
    selectPage(0)
    expect(publishStub.withArgs('Pictures:selectPage').firstCall.args).toEqual([
      'Pictures:selectPage',
      'Default Page Selected',
    ])
  })
  it('should not publish loading error when publishing default page select', () => {
    selectPage(0)
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(0)
  })
  it('should not publish error when no pages', () => {
    // test various cases, none should error
    selectPage(0)
    selectPage(-1)
    selectPage(1e9)
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(0)
  })
  it('should not call selectPage when trying to select zero page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(0)
    expect(publishStub.withArgs('Pictures:selectPage').callCount).toBe(0)
  })
  it('should publish error once when trying to select zero page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(0)
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(1)
  })
  it('should publish error with expected args when trying to select zero page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(0)
    expect(publishStub.withArgs('Loading:Error').firstCall.args).toEqual([
      'Loading:Error',
      'Invalid Page Index Selected',
    ])
  })
  it('should not call selectPage when trying to select negative page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(-1)
    expect(publishStub.withArgs('Pictures:selectPage').callCount).toBe(0)
  })
  it('should publish error once when trying to select negative page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(-1)
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(1)
  })
  it('should publish error with expected args when trying to select negative page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(-1)
    expect(publishStub.withArgs('Loading:Error').firstCall.args).toEqual([
      'Loading:Error',
      'Invalid Page Index Selected',
    ])
  })
  it('should not call selectPage when trying to select out of range page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(11)
    expect(publishStub.withArgs('Pictures:selectPage').callCount).toBe(0)
  })
  it('should publish error once when trying to select out of range page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(11)
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(1)
  })
  it('should publish error with expected args when trying to select out of range page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(11)
    expect(publishStub.withArgs('Loading:Error').firstCall.args).toEqual([
      'Loading:Error',
      'Invalid Page Index Selected',
    ])
  })
  it('should call selectPage once when trying to select valid page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(5)
    expect(publishStub.withArgs('Pictures:selectPage').callCount).toBe(1)
  })
  it('should not publish error when trying to select valid page', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(5)
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(0)
  })
  it('should remove active class from current active page link when switching', () => {
    const links = makePageLinks(100)
    makePages(100)
    links[50]?.classList.add('active')
    expect(links[50]?.classList.contains('active')).toBe(true)
    selectPage(25)
    expect(links[50]?.classList.contains('active')).toBe(false)
  })
  it('should add active class to next page link when switching', () => {
    const links = makePageLinks(100)
    makePages(100)
    links[50]?.classList.add('active')
    expect(links[25]?.classList.contains('active')).toBe(false)
    selectPage(25)
    expect(links[25]?.classList.contains('active')).toBe(true)
  })
  it('should add hidden class to active page when switching', () => {
    makePageLinks(100)
    const pages = makePages(100)
    pages[50]?.classList.remove('hidden')
    expect(pages[50]?.classList.contains('hidden')).toBe(false)
    selectPage(25)
    expect(pages[50]?.classList.contains('hidden')).toBe(true)
  })
  it('should remove hidden class from next page when switching', () => {
    makePageLinks(100)
    const pages = makePages(100)
    pages[24]?.classList.add('hidden')
    expect(pages[24]?.classList.contains('hidden')).toBe(true)
    selectPage(25)
    expect(pages[24]?.classList.contains('hidden')).toBe(false)
  })
  it('should publish notification once on successful page select', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(5)
    expect(publishStub.withArgs('Pictures:selectPage').callCount).toBe(1)
  })
  it('should publish notification with expected args on successful page select', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(5)
    expect(publishStub.withArgs('Pictures:selectPage').firstCall.args).toEqual([
      'Pictures:selectPage',
      'New Page 5 Selected',
    ])
  })
  it('should not publish error on successful page select', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(5)
    expect(publishStub.withArgs('Loading:Error').callCount).toBe(0)
  })
  it('should not publish notification on error page select', () => {
    makePageLinks(10)
    makePages(10)
    selectPage(50)
    expect(publishStub.withArgs('Pictures:selectPage').callCount).toBe(0)
  })
})
