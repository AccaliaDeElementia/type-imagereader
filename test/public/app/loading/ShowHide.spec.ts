'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Loading } from '../../../../public/scripts/app/loading'
import { Cast } from '../../../testutils/TypeGuards'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading subscriber "Loading:Show" and "Loading:Hide"', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {}
    PubSub.deferred = []
    Loading.overlay = null
    Loading.navbar = null
    Loading.Init()
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should show the loading overlay for "Loading:Show"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'none')
    PubSub.Publish('Loading:Show')
    expect(overlay?.style.getPropertyValue('display')).to.equal('block')
  })
  it('should hide the loading overlay for "Loading:Hide"', () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'block')
    PubSub.Publish('Loading:Hide')
    expect(overlay?.style.getPropertyValue('display')).to.equal('none')
  })
  it('should tolerate missing overlay for "Loading:Show"', () => {
    Loading.overlay = null
    expect(() => {
      PubSub.Publish('Loading:Show')
    }).to.not.throw()
  })
  it('should hide the loading overlay for "Loading:Hide"', () => {
    Loading.overlay = null
    expect(() => {
      PubSub.Publish('Loading:Hide')
    }).to.not.throw()
  })
})
