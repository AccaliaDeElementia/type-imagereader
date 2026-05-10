'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictures/state.js'
import { makeTab, Internals } from '#public/scripts/app/pictures/grid.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures makeTab()', () => {
  let dom = new JSDOM('<html></html>', {})
  let makePicturesPageSpy = sandbox.stub()
  let makePaginatorSpy = sandbox.stub()
  let tab: HTMLElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    makePicturesPageSpy = sandbox.stub(Internals, 'makePicturesPage')
    makePicturesPageSpy.callsFake((pagenum: number, _: Picture[]) => {
      const retval = dom.window.document.createElement('div')
      retval.classList.add('page')
      retval.classList.add(`data-page-${pagenum}`)
      return retval
    })
    makePaginatorSpy = sandbox.stub(Internals, 'makePaginator')
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
    resetPubSub()
    tab = dom.window.document.querySelector('#tabImages')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should call makePicturesPage with page 1', () => {
    makeTab()
    expect(makePicturesPageSpy.calledWith(1)).to.equal(true)
  })
  it('should add provided page to pictures tab', () => {
    makeTab()
    expect(tab?.querySelector('.page')).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should call makePicturesPage once per page', () => {
    Pictures.pageSize = 2
    makeTab()
    expect(makePicturesPageSpy.callCount).to.equal(16)
  })
  it('should make pages according to pageSize', () => {
    Pictures.pageSize = 2
    makeTab()
    expect(tab?.querySelectorAll('.page')).to.have.length(16)
  })
  it('should call makePicturesPage for calculated page count', () => {
    Pictures.pageSize = 10
    makeTab()
    expect(makePicturesPageSpy.callCount).to.equal(4)
  })
  it('should make pages with image subsets for each page', () => {
    Pictures.pageSize = 10
    makeTab()
    for (let i = 0; i < 4; i += 1) {
      const call = makePicturesPageSpy.getCall(i)
      expect(call.args).to.have.lengthOf(2)
      expect(call.args[0]).to.equal(i + 1)
      expect(call.args[1]).to.deep.equal(Pictures.pictures.slice(i * 10, (i + 1) * 10))
    }
  })
  it('should call makePaginator once', () => {
    makeTab()
    expect(makePaginatorSpy.callCount).to.equal(1)
  })
  it('should make paginator', () => {
    makeTab()
    expect(tab?.querySelector('.paginator')).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should make paginator for calculated page count', () => {
    Pictures.pageSize = 4
    makeTab()
    expect(makePaginatorSpy.firstCall.args).to.deep.equal([8])
  })
  it('should add paginator to tab for calculated page count', () => {
    Pictures.pageSize = 4
    makeTab()
    expect(tab?.querySelector('.paginator')).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should still call makePaginator when it returns null', () => {
    makePaginatorSpy.returns(null)
    makeTab()
    expect(makePaginatorSpy.callCount).to.equal(1)
  })
  it('should omit paginator when makePaginator returns null', () => {
    makePaginatorSpy.returns(null)
    makeTab()
    expect(tab?.querySelector('.paginator')).to.equal(null)
  })
})
