'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Cast } from '#testutils/TypeGuards.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures function MakePaginatorItem()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let selectPageSpy = sandbox.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    selectPageSpy = sandbox.stub(Pictures, 'SelectPage')
    resetPubSub()
    const holder = dom.window.document.createElement('div')
    holder.innerHTML =
      '<template id="PaginatorItem"><li class="page-item"><a class="page-link" href="#"><span>foobar</span></a></li></template>'
    dom.window.document.body.appendChild(holder)
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
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
    const spy = sandbox.stub().returns(71)
    const result = Pictures.MakePaginatorItem('frobitz', spy)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(spy.callCount).to.equal(1)
  })
  it('should add click handler that calls SelectPage', () => {
    const result = Pictures.MakePaginatorItem('frobitz', () => 99)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(selectPageSpy.callCount).to.equal(1)
  })
  it('should add click handler that passes selector result to SelectPage', () => {
    const result = Pictures.MakePaginatorItem('frobitz', () => 99)
    const evt = new dom.window.MouseEvent('click')
    result?.dispatchEvent(evt)
    expect(selectPageSpy.firstCall.args).to.deep.equal([99])
  })
})
