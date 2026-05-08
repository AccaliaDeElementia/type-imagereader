'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import Sinon from 'sinon'
import '#public/scripts/app/pictures/state.js'
import { Grid } from '#public/scripts/app/pictures/grid.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
`

describe('public/app/pictures/grid function ResetMarkup()', () => {
  let dom = new JSDOM(render(markup), {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
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
    Grid.ResetMarkup()
    expect(tab.children).to.have.lengthOf(0)
  })
  it('should remove existing .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('page')
      tab.appendChild(node)
    }
    Grid.ResetMarkup()
    expect(tab.children).to.have.lengthOf(0)
  })
  it('should preserve existing non .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('foo')
      tab.appendChild(node)
    }
    Grid.ResetMarkup()
    expect(tab.children).to.have.lengthOf(15)
  })
})
