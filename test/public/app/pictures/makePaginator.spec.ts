'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/pictures/grid.js'
import { cast } from '#testutils/typeGuards.js'
import { render } from 'pug'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    template#Paginator
      nav.pages
        ul.pagination
`

describe('public/app/pictures makePaginator()', () => {
  let dom = new JSDOM('<html></html>', {})
  let makePageItemSpy = sandbox.stub()
  let getCurrentPageSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    makePageItemSpy = sandbox
      .stub(Internals, 'makePaginatorItem')
      .callsFake(() => dom.window.document.createElement('li'))
    getCurrentPageSpy = sandbox.stub(Internals, 'getCurrentPage').returns(0)
    resetPubSub()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should return null for negative page count', () => {
    const result = Internals.makePaginator(-7)
    expect(result).to.equal(null)
  })
  it('should return null for zero page count', () => {
    const result = Internals.makePaginator(0)
    expect(result).to.equal(null)
  })
  it('should return null for single page count', () => {
    const result = Internals.makePaginator(-7)
    expect(result).to.equal(null)
  })
  it('should return null for missing template', () => {
    const template = dom.window.document.querySelector('#Paginator')
    template?.parentElement?.removeChild(template)
    const result = Internals.makePaginator(7)
    expect(result).to.equal(null)
  })
  it('should return nav element for valid paginator', () => {
    const result = Internals.makePaginator(7)
    expect(result).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should return nav element with nav nodeName for valid paginator', () => {
    const result = Internals.makePaginator(7)
    expect(result?.nodeName).to.equal('NAV')
  })
  it('should create previousPage element first', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    makePageItemSpy.onFirstCall().returns(sentinal)
    Internals.makePaginator(7)
    expect(makePageItemSpy.firstCall.args[0]).to.equal('«')
  })
  it('should create pagination list for valid paginator', () => {
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should insert previousPage element as first child', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    makePageItemSpy.onFirstCall().returns(sentinal)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.firstElementChild).to.equal(sentinal)
  })
  it('should select previous page for previous page selector when on valid page', () => {
    getCurrentPageSpy.returns(5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.firstCall.args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(4)
  })
  it('should select previous page for previous page selector when on huge page', () => {
    getCurrentPageSpy.returns(50)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.firstCall.args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(49)
  })
  it('should select first page for previous page selector when on first page', () => {
    getCurrentPageSpy.returns(1)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.firstCall.args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(1)
  })
  it('should select first page for previous page selector when on negative page', () => {
    getCurrentPageSpy.returns(-5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.firstCall.args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(1)
  })
  it('should create nextPage element last', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    makePageItemSpy.onCall(8).returns(sentinal)
    Internals.makePaginator(7)
    expect(makePageItemSpy.getCall(8).args[0]).to.equal('»')
  })
  it('should insert nextPage element as last child', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    makePageItemSpy.onCall(8).returns(sentinal)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.lastElementChild).to.equal(sentinal)
  })
  it('should select next page for next page selector when on valid page', () => {
    getCurrentPageSpy.returns(5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.getCall(8).args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(6)
  })
  it('should select last page for next page selector when on huge page', () => {
    getCurrentPageSpy.returns(50)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.getCall(8).args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(7)
  })
  it('should select last page for next page selector when on last page', () => {
    getCurrentPageSpy.returns(7)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.getCall(8).args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(7)
  })
  it('should select next page for next page selector when on negative page', () => {
    getCurrentPageSpy.returns(-5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.getCall(8).args[1])
    assert(fn !== undefined)
    expect(fn()).to.equal(-4)
  })
  it('should create specific page elements with correct labels', () => {
    Internals.makePaginator(7)
    for (let i = 1; i <= 7; i += 1) {
      expect(makePageItemSpy.getCall(i).args[0]).to.equal(`${i}`)
    }
  })
  it('should insert specific page elements in order', () => {
    const nodes = Array.from({ length: 8 }).map(() => dom.window.document.createElement('div'))
    for (let i = 1; i <= 7; i += 1) {
      makePageItemSpy.onCall(i).returns(nodes[i])
    }
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    for (let i = 1; i <= 7; i += 1) {
      expect(pages?.children[i]).to.equal(nodes[i])
    }
  })
  it('should select specific page for middle pages', () => {
    Internals.makePaginator(7)
    for (let i = 1; i <= 7; i += 1) {
      const fn = cast<(() => number) | undefined>(makePageItemSpy.getCall(i).args[1])
      assert(fn !== undefined)
      expect(fn()).to.equal(i)
    }
  })
  it('should skip the previousPage child when makePaginatorItem returns undefined for it', () => {
    makePageItemSpy.onFirstCall().returns(undefined)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.children.length).to.equal(8)
  })
  it('should skip a page child when makePaginatorItem returns undefined for it', () => {
    makePageItemSpy.onCall(3).returns(undefined)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.children.length).to.equal(8)
  })
  it('should skip the nextPage child when makePaginatorItem returns undefined for it', () => {
    makePageItemSpy.onCall(8).returns(undefined)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.children.length).to.equal(8)
  })
})
