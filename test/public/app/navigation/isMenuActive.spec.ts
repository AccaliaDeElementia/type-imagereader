'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { isMenuActive } from '#public/scripts/app/navigation.js'

const markup = `
html
  head
    title
  body
    div
      a.navbar-brand
      a.menuButton
    div#mainMenu
      div.innerTarget
`
describe('public/app/navigation isMenuActive()', () => {
  let dom = new JSDOM('', {})
  let menuNode: HTMLDivElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    menuNode = dom.window.document.querySelector('#mainMenu')
  })
  afterEach(() => {
    unmountDom()
  })
  it('should return true for missing menu!', () => {
    menuNode?.parentElement?.removeChild(menuNode)
    expect(isMenuActive()).to.equal(true)
  })
  it('should return true for non hidden menu', () => {
    menuNode?.classList.remove('hidden')
    expect(isMenuActive()).to.equal(true)
  })
  it('should return false for hidden menu', () => {
    menuNode?.classList.add('hidden')
    expect(isMenuActive()).to.equal(false)
  })
})
