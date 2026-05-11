'use sanity'

import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/pictures/grid.js'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures makePaginatorItem()', () => {
  let dom = new JSDOM('<html></html>', {})
  let selectPageSpy = sandbox.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    selectPageSpy = sandbox.stub(Internals, 'selectPage')
    resetPubSub()
    const holder = dom.window.document.createElement('div')
    holder.innerHTML =
      '<template id="PaginatorItem"><li class="page-item"><a class="page-link" href="#"><span>foobar</span></a></li></template>'
    dom.window.document.body.appendChild(holder)
  })
  afterEach(() => {
    sandbox.restore()
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
    const spy = sandbox.stub().returns(71)
    const result = Internals.makePaginatorItem('frobitz', spy)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(spy.callCount).toBe(1)
  })
  it('should add click handler that calls selectPage', () => {
    const result = Internals.makePaginatorItem('frobitz', () => 99)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(selectPageSpy.callCount).toBe(1)
  })
  it('should add click handler that passes selector result to selectPage', () => {
    const result = Internals.makePaginatorItem('frobitz', () => 99)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(selectPageSpy.firstCall.args).toEqual([99])
  })
})
