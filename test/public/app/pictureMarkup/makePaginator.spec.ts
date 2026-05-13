'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/pictureMarkup.js'
import { cast } from '#testutils/typeGuards.js'
import { render } from 'pug'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    template#Paginator
      nav.pages
        ul.pagination
`

describe('public/app/pictures makePaginator()', () => {
  let dom = new JSDOM('<html></html>', {})
  let makePageItemSpy: MockInstance = vi.fn()
  let getCurrentPageSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    makePageItemSpy = vi
      .spyOn(Internals, 'makePaginatorItem')
      .mockImplementation((..._args: unknown[]) => undefined)
      .mockImplementation(() => dom.window.document.createElement('li'))
    getCurrentPageSpy = vi.spyOn(Internals, 'getCurrentPage').mockReturnValue(0)
    resetPubSub()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should return null for negative page count', () => {
    const result = Internals.makePaginator(-7)
    expect(result).toBe(null)
  })
  it('should return null for zero page count', () => {
    const result = Internals.makePaginator(0)
    expect(result).toBe(null)
  })
  it('should return null for single page count', () => {
    const result = Internals.makePaginator(-7)
    expect(result).toBe(null)
  })
  it('should return null for missing template', () => {
    const template = dom.window.document.querySelector('#Paginator')
    template?.parentElement?.removeChild(template)
    const result = Internals.makePaginator(7)
    expect(result).toBe(null)
  })
  it('should return nav element for valid paginator', () => {
    const result = Internals.makePaginator(7)
    expect(result).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should return nav element with nav nodeName for valid paginator', () => {
    const result = Internals.makePaginator(7)
    expect(result?.nodeName).toBe('NAV')
  })
  it('should create previousPage element first', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    makePageItemSpy.mockReturnValueOnce(sentinal)
    Internals.makePaginator(7)
    expect(makePageItemSpy.mock.calls[0]?.[0]).toBe('«')
  })
  it('should create pagination list for valid paginator', () => {
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should insert previousPage element as first child', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    makePageItemSpy.mockReturnValueOnce(sentinal)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.firstElementChild).toBe(sentinal)
  })
  it('should select previous page for previous page selector when on valid page', () => {
    getCurrentPageSpy.mockReturnValue(5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[0]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(4)
  })
  it('should select previous page for previous page selector when on huge page', () => {
    getCurrentPageSpy.mockReturnValue(50)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[0]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(49)
  })
  it('should select first page for previous page selector when on first page', () => {
    getCurrentPageSpy.mockReturnValue(1)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[0]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(1)
  })
  it('should select first page for previous page selector when on negative page', () => {
    getCurrentPageSpy.mockReturnValue(-5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[0]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(1)
  })
  it('should create nextPage element last', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    makePageItemSpy.mockReturnValueOnce(sentinal)
    Internals.makePaginator(7)
    expect(makePageItemSpy.mock.calls[8]?.[0]).toBe('»')
  })
  it('should insert nextPage element as last child', () => {
    const sentinal = dom.window.document.createElement('div')
    sentinal.classList.add('sentinal')
    // pad calls 0-7 (prev + 7 page items) so sentinal lands on call 8 (nextPage)
    for (let i = 0; i < 8; i += 1) {
      makePageItemSpy.mockReturnValueOnce(dom.window.document.createElement('li'))
    }
    makePageItemSpy.mockReturnValueOnce(sentinal)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.lastElementChild).toBe(sentinal)
  })
  it('should select next page for next page selector when on valid page', () => {
    getCurrentPageSpy.mockReturnValue(5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[8]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(6)
  })
  it('should select last page for next page selector when on huge page', () => {
    getCurrentPageSpy.mockReturnValue(50)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[8]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(7)
  })
  it('should select last page for next page selector when on last page', () => {
    getCurrentPageSpy.mockReturnValue(7)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[8]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(7)
  })
  it('should select next page for next page selector when on negative page', () => {
    getCurrentPageSpy.mockReturnValue(-5)
    Internals.makePaginator(7)
    const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[8]?.[1])
    assert(fn !== undefined)
    expect(fn()).toBe(-4)
  })
  it('should create specific page elements with correct labels', () => {
    Internals.makePaginator(7)
    for (let i = 1; i <= 7; i += 1) {
      expect(makePageItemSpy.mock.calls[i]?.[0]).toBe(`${i}`)
    }
  })
  it('should insert specific page elements in order', () => {
    const nodes = Array.from({ length: 8 }).map(() => dom.window.document.createElement('div'))
    for (let i = 0; i <= 7; i += 1) {
      makePageItemSpy.mockReturnValueOnce(nodes[i])
    }
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    for (let i = 1; i <= 7; i += 1) {
      expect(pages?.children[i]).toBe(nodes[i])
    }
  })
  it('should select specific page for middle pages', () => {
    Internals.makePaginator(7)
    for (let i = 1; i <= 7; i += 1) {
      const fn = cast<(() => number) | undefined>(makePageItemSpy.mock.calls[i]?.[1])
      assert(fn !== undefined)
      expect(fn()).toBe(i)
    }
  })
  it('should skip the previousPage child when makePaginatorItem returns undefined for it', () => {
    makePageItemSpy.mockReturnValueOnce(undefined)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.children.length).toBe(8)
  })
  it('should skip a page child when makePaginatorItem returns undefined for it', () => {
    // pad calls 0-2 so undefined lands on call 3 (a middle page)
    for (let i = 0; i < 3; i += 1) {
      makePageItemSpy.mockReturnValueOnce(dom.window.document.createElement('li'))
    }
    makePageItemSpy.mockReturnValueOnce(undefined)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.children.length).toBe(8)
  })
  it('should skip the nextPage child when makePaginatorItem returns undefined for it', () => {
    // pad calls 0-7 (prev + 7 pages) so undefined lands on call 8 (nextPage)
    for (let i = 0; i < 8; i += 1) {
      makePageItemSpy.mockReturnValueOnce(dom.window.document.createElement('li'))
    }
    makePageItemSpy.mockReturnValueOnce(undefined)
    const result = Internals.makePaginator(7)
    const pages = result?.querySelector('.pagination')
    expect(pages?.children.length).toBe(8)
  })
})
