'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import Sinon from 'sinon'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Imports } from '#public/scripts/app/pictures/state.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/PubSub.js'

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

describe('public/app/pictures function ResetMarkup()', () => {
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
    gridResetSpy = sandbox.stub(Imports, 'GridResetMarkup')
    viewerResetSpy = sandbox.stub(Imports, 'ViewerResetMarkup')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should set mainImage node', () => {
    Pictures.ResetMarkup()
    expect(Pictures.mainImage).to.not.equal(null)
  })
  it('should set imageCard node', () => {
    Pictures.ResetMarkup()
    expect(Pictures.imageCard).to.not.equal(null)
  })
  it('should tolerate missing mainImage node', () => {
    const node = dom.window.document.querySelector('#bigImage')
    assert(node !== null)
    node.parentElement?.removeChild(node)
    Pictures.ResetMarkup()
    expect(Pictures.mainImage).to.equal(null)
  })
  it('should tolerate missing imageCard node', () => {
    const node = dom.window.document.querySelector('#ImageCard')
    assert(node !== null)
    node.parentElement?.removeChild(node)
    Pictures.ResetMarkup()
    expect(Pictures.imageCard).to.equal(null)
  })
  it('should call Grid.ResetMarkup once', () => {
    Pictures.ResetMarkup()
    expect(gridResetSpy.callCount).to.equal(1)
  })
  it('should call Viewer.ResetMarkup once', () => {
    Pictures.ResetMarkup()
    expect(viewerResetSpy.callCount).to.equal(1)
  })
  it('should set mainImage ref before calling Viewer.ResetMarkup', () => {
    let mainImageWhenViewerCalled: HTMLImageElement | null = null
    viewerResetSpy.callsFake(() => {
      mainImageWhenViewerCalled = Pictures.mainImage
    })
    Pictures.ResetMarkup()
    expect(mainImageWhenViewerCalled).to.not.equal(null)
  })
})
