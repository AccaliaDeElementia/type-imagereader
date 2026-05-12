'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Loading } from '#public/scripts/app/loading.js'
import { capturedDeferred, capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()
const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading subscriber "Loading:Success"', () => {
  let dom: JSDOM = new JSDOM('', {})
  let subscribeStub = sandbox.stub()
  let deferStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    subscribeStub = sandbox.stub(Imports, 'subscribe')
    sandbox.stub(Imports, 'publish')
    deferStub = sandbox.stub(Imports, 'defer')
    Loading.overlay = null
    Loading.navbar = null
    init()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should remove css transition style on navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Success')
    await handler(undefined)
    expect(navbar?.style.getPropertyValue('transition')).toBe('')
  })
  it('should set soothing green background navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('background-color')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Success')
    await handler(undefined)
    expect(navbar?.style.getPropertyValue('background-color')).toBe('rgb(0, 170, 0)')
  })
  it('should set a deferred function', async () => {
    expect(deferStub.callCount).toBe(0)
    const handler = capturedSubscriber(subscribeStub, 'Loading:Success')
    await handler(undefined)
    expect(deferStub.callCount).toBe(1)
  })
  it('should defer transition definition', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('transition')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Success')
    await handler(undefined)
    capturedDeferred(deferStub).forEach((fn) => {
      fn()
    })
    expect(navbar?.style.getPropertyValue('transition')).toBe('background-color 2s ease-in-out')
  })
  it('should defer background-color change', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('background-color', '#FFFFFF')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Success')
    await handler(undefined)
    capturedDeferred(deferStub).forEach((fn) => {
      fn()
    })
    expect(navbar?.style.getPropertyValue('background-color')).toBe('')
  })
})
