'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import Sinon from 'sinon'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Imports } from '#public/scripts/app/pictures/state.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#bigImage
      img.hidden
    template#ImageCard
      div.card
        div.card-body
          h5 placeholder
`

describe('public/app/pictures resetMarkup()', () => {
  let dom = new JSDOM(render(markup), {})
  let gridResetSpy = sandbox.stub()
  let viewerResetSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Pictures.mainImage = null
    Pictures.imageCard = null
    gridResetSpy = sandbox.stub(Imports, 'gridResetMarkup')
    viewerResetSpy = sandbox.stub(Imports, 'viewerResetMarkup')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should set mainImage node', () => {
    Pictures.resetMarkup()
    expect(Pictures.mainImage).to.not.equal(null)
  })
  it('should set imageCard node', () => {
    Pictures.resetMarkup()
    expect(Pictures.imageCard).to.not.equal(null)
  })
  it('should tolerate missing mainImage node', () => {
    const node = dom.window.document.querySelector('#bigImage')
    assert(node !== null)
    node.parentElement?.removeChild(node)
    Pictures.resetMarkup()
    expect(Pictures.mainImage).to.equal(null)
  })
  it('should tolerate missing imageCard node', () => {
    const node = dom.window.document.querySelector('#ImageCard')
    assert(node !== null)
    node.parentElement?.removeChild(node)
    Pictures.resetMarkup()
    expect(Pictures.imageCard).to.equal(null)
  })
  it('should call Grid.resetMarkup once', () => {
    Pictures.resetMarkup()
    expect(gridResetSpy.callCount).to.equal(1)
  })
  it('should call Viewer.resetMarkup once', () => {
    Pictures.resetMarkup()
    expect(viewerResetSpy.callCount).to.equal(1)
  })
  it('should set mainImage ref before calling Viewer.resetMarkup', () => {
    let mainImageWhenViewerCalled: HTMLImageElement | null = null
    viewerResetSpy.callsFake(() => {
      mainImageWhenViewerCalled = Pictures.mainImage
    })
    Pictures.resetMarkup()
    expect(mainImageWhenViewerCalled).to.not.equal(null)
  })
})
