'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { publish } from '#public/scripts/app/pubsub.js'
import { init, Loading } from '#public/scripts/app/loading.js'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()
const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading subscriber "Loading:show" and "Loading:Hide"', () => {
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Loading.overlay = null
    Loading.navbar = null
    init()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should show the loading overlay for "Loading:show"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'none')
    publish('Loading:show')
    expect(overlay?.style.getPropertyValue('display')).toBe('block')
  })
  it('should hide the loading overlay for "Loading:Hide"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'block')
    publish('Loading:Hide')
    expect(overlay?.style.getPropertyValue('display')).toBe('none')
  })
  it('should tolerate missing overlay for "Loading:show"', () => {
    Loading.overlay = null
    expect(() => {
      publish('Loading:show')
    }).not.toThrow()
  })
  it('should tolerate missing overlay for "Loading:Hide"', () => {
    Loading.overlay = null
    expect(() => {
      publish('Loading:Hide')
    }).not.toThrow()
  })
})
