'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/pictureMarkup.js'
import { resetPubSub } from '#testutils/pubsub.js'

describe('public/app/pictures makePaginatorItem()', () => {
  let dom = new JSDOM('<html></html>', {})
  let selectPageSpy = vi.fn().mockResolvedValue(undefined)
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    selectPageSpy = vi.spyOn(Internals, 'selectPage').mockImplementation((..._args: unknown[]) => undefined)
    resetPubSub()
    const holder = dom.window.document.createElement('div')
    holder.innerHTML =
      '<template id="PaginatorItem"><li class="page-item"><a class="page-link" href="#"><span>foobar</span></a></li></template>'
    dom.window.document.body.appendChild(holder)
  })
  afterEach(() => {
    unmountDom()
  })
  it('returns an List Item Element', () => {
    const result = Internals.makePaginatorItem('foobar', () => 0)
    expect(result).toBeInstanceOf(dom.window.HTMLLIElement)
  })
  it('should replace span contents as label', () => {
    const result = Internals.makePaginatorItem('frobitz', () => 0)
    const label = result?.querySelector('span')?.innerHTML
    expect(label).toBe('frobitz')
  })
  it('should add click handler that calls provided selector to determine page to navigate to', () => {
    const spy = vi.fn().mockReturnValue(71)
    const result = Internals.makePaginatorItem('frobitz', spy)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(spy.mock.calls.length).toBe(1)
  })
  it('should add click handler that calls selectPage', () => {
    const result = Internals.makePaginatorItem('frobitz', () => 99)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(selectPageSpy.mock.calls.length).toBe(1)
  })
  it('should add click handler that passes selector result to selectPage', () => {
    const result = Internals.makePaginatorItem('frobitz', () => 99)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(selectPageSpy.mock.calls[0]).toEqual([99])
  })
})
