'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'
import { render } from 'pug'
import type { Picture } from '../../../../contracts/listing'

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures function MakeTab()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let makePicturesPageSpy = Sinon.stub()
  let makePaginatorSpy = Sinon.stub()
  let tab: HTMLElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    makePicturesPageSpy = Sinon.stub(Pictures, 'MakePicturesPage')
    makePicturesPageSpy.callsFake((pagenum: number, _: Picture[]) => {
      const retval = dom.window.document.createElement('div')
      retval.classList.add('page')
      retval.classList.add(`data-page-${pagenum}`)
      return retval
    })
    makePaginatorSpy = Sinon.stub(Pictures, 'MakePaginator')
    makePaginatorSpy.callsFake(() => {
      const retval = dom.window.document.createElement('div')
      retval.classList.add('paginator')
      return retval
    })
    Pictures.pictures = Array.from({ length: 32 }).map(
      (_: unknown, i: number): Picture => ({
        path: `/some/path/${i}.png`,
        name: `${i}.png`,
        seen: false,
      }),
    )
    PubSub.subscribers = {}
    PubSub.deferred = []
    tab = dom.window.document.querySelector('#tabImages')
  })
  afterEach(() => {
    makePaginatorSpy.restore()
    makePicturesPageSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should add provided page to pictures tab', () => {
    Pictures.MakeTab()
    expect(makePicturesPageSpy.calledWith(1)).to.equal(true)
    expect(tab?.querySelector('.page')).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should make pages according to pageSize', () => {
    Pictures.pageSize = 2
    Pictures.MakeTab()
    expect(makePicturesPageSpy.callCount).to.equal(16)
    expect(tab?.querySelectorAll('.page')).to.have.length(16)
  })
  it('should make pages with image subsets for each page', () => {
    Pictures.pageSize = 10
    Pictures.MakeTab()
    expect(makePicturesPageSpy.callCount).to.equal(4)
    for (let i = 0; i < 4; i++) {
      const call = makePicturesPageSpy.getCall(i)
      expect(call.args).to.have.lengthOf(2)
      expect(call.args[0]).to.equal(i + 1)
      expect(call.args[1]).to.deep.equal(Pictures.pictures.slice(i * 10, (i + 1) * 10))
    }
  })
  it('should make paginator', () => {
    Pictures.MakeTab()
    expect(makePaginatorSpy.callCount).to.equal(1)
    expect(tab?.querySelector('.paginator')).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should make paginatorfor calculated page count', () => {
    Pictures.pageSize = 4
    Pictures.MakeTab()
    expect(makePaginatorSpy.firstCall.args).to.deep.equal([8])
    expect(tab?.querySelector('.paginator')).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should omit paginator when MakePaginator returns null', () => {
    makePaginatorSpy.returns(null)
    Pictures.MakeTab()
    expect(makePaginatorSpy.callCount).to.equal(1)
    expect(tab?.querySelector('.paginator')).to.equal(null)
  })
})
