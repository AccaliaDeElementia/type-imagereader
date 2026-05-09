'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import { Publish } from '#public/scripts/app/pubsub.js'
import { Init, Loading } from '#public/scripts/app/loading.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()
const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading subscriber "Loading:Show" and "Loading:Hide"', () => {
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Loading.overlay = null
    Loading.navbar = null
    Init()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should show the loading overlay for "Loading:Show"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'none')
    Publish('Loading:Show')
    expect(overlay?.style.getPropertyValue('display')).to.equal('block')
  })
  it('should hide the loading overlay for "Loading:Hide"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'block')
    Publish('Loading:Hide')
    expect(overlay?.style.getPropertyValue('display')).to.equal('none')
  })
  it('should tolerate missing overlay for "Loading:Show"', () => {
    Loading.overlay = null
    expect(() => {
      Publish('Loading:Show')
    }).to.not.throw()
  })
  it('should tolerate missing overlay for "Loading:Hide"', () => {
    Loading.overlay = null
    expect(() => {
      Publish('Loading:Hide')
    }).to.not.throw()
  })
})
