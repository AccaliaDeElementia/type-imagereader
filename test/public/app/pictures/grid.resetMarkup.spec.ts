'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import Sinon from 'sinon'
import { Grid, resetMarkup } from '#public/scripts/app/pictures/grid.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
    template#ImageCard
      div.card
        div.card-body
          h5 placeholder
`

describe('public/app/pictures resetMarkup()', () => {
  let dom = new JSDOM(render(markup), {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Grid.imageCard = null
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should remove existing .pages from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('pages')
      tab.appendChild(node)
    }
    resetMarkup()
    expect(tab.children).toHaveLength(0)
  })
  it('should remove existing .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('page')
      tab.appendChild(node)
    }
    resetMarkup()
    expect(tab.children).toHaveLength(0)
  })
  it('should preserve existing non .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('foo')
      tab.appendChild(node)
    }
    resetMarkup()
    expect(tab.children).toHaveLength(15)
  })
  it('should set imageCard node', () => {
    resetMarkup()
    expect(Grid.imageCard).not.toBe(null)
  })
  it('should tolerate missing imageCard node', () => {
    const node = dom.window.document.querySelector('#ImageCard')
    assert(node !== null)
    node.parentElement?.removeChild(node)
    resetMarkup()
    expect(Grid.imageCard).toBe(null)
  })
})
