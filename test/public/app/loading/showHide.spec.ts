'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Loading } from '#public/scripts/app/loading.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { eventuallyFulfills } from '#testutils/errors.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading subscriber "Loading:show" and "Loading:Hide"', () => {
  let dom: JSDOM = new JSDOM('', {})
  let subscribeStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    Loading.overlay = null
    Loading.navbar = null
    init()
  })
  afterEach(() => {
    unmountDom()
  })
  it('should show the loading overlay for "Loading:show"', async () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'none')
    await capturedSubscriber(subscribeStub, 'Loading:show')(undefined)
    expect(overlay?.style.getPropertyValue('display')).toBe('block')
  })
  it('should hide the loading overlay for "Loading:Hide"', async () => {
    const overlay = dom.window.document.querySelector<HTMLElement>('#loadingScreen')
    overlay?.style.setProperty('display', 'block')
    await capturedSubscriber(subscribeStub, 'Loading:Hide')(undefined)
    expect(overlay?.style.getPropertyValue('display')).toBe('none')
  })
  it('should tolerate missing overlay for "Loading:show"', async () => {
    Loading.overlay = null
    await eventuallyFulfills(capturedSubscriber(subscribeStub, 'Loading:show')(undefined))
  })
  it('should tolerate missing overlay for "Loading:Hide"', async () => {
    Loading.overlay = null
    await eventuallyFulfills(capturedSubscriber(subscribeStub, 'Loading:Hide')(undefined))
  })
})
