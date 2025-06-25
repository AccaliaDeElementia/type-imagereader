'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'

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
describe('public/app/navigation function IsMenuActive()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  let menuNode: HTMLDivElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    menuNode = dom.window.document.querySelector('#mainMenu')
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should return true for missing menu!', () => {
    menuNode?.parentElement?.removeChild(menuNode)
    expect(Navigation.IsMenuActive()).to.equal(true)
  })
  it('should return true for non hidden menu', () => {
    menuNode?.classList.remove('hidden')
    expect(Navigation.IsMenuActive()).to.equal(true)
  })
  it('should return true for hidden menu', () => {
    menuNode?.classList.add('hidden')
    expect(Navigation.IsMenuActive()).to.equal(false)
  })
})
