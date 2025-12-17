'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'

describe('public/app/pictures function MakePaginatorItem()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let selectPageSpy = Sinon.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    selectPageSpy = Sinon.stub(Pictures, 'SelectPage')
    PubSub.subscribers = {}
    PubSub.deferred = []
    const holder = dom.window.document.createElement('div')
    holder.innerHTML =
      '<template id="PaginatorItem"><li class="page-item"><a class="page-link" href="#"><span>foobar</span></a></li></template>'
    dom.window.document.body.appendChild(holder)
  })
  afterEach(() => {
    selectPageSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('returns an List Item Element', () => {
    const result = Pictures.MakePaginatorItem('foobar', () => 0)
    expect(result).to.be.an.instanceOf(dom.window.HTMLLIElement)
  })
  it('should replace span contents as label', () => {
    const result = Pictures.MakePaginatorItem('frobitz', () => 0)
    const label = result?.querySelector('span')?.innerHTML
    expect(label).to.equal('frobitz')
  })
  it('should add click handler that calls provided selector to determine page to navigate to', () => {
    const spy = Sinon.stub().returns(71)
    const result = Pictures.MakePaginatorItem('frobitz', spy)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(spy.callCount).to.equal(1)
  })
  it('should add click handler that selects page based on selector results', () => {
    const result = Pictures.MakePaginatorItem('frobitz', () => 99)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(selectPageSpy.callCount).to.equal(1)
    expect(selectPageSpy.firstCall.args).to.deep.equal([99])
  })
})
