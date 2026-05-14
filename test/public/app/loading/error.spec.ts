'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Loading } from '#public/scripts/app/loading.js'
import { capturedDeferred, capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading subscriber "Loading:Error"', () => {
  let consoleError: MockInstance = vi.fn()
  let publishStub: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let deferStub: MockInstance = vi.fn()
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    consoleError = vi.spyOn(global.window.console, 'error').mockImplementation((..._args: unknown[]) => undefined)
    resetPubSub()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    deferStub = vi.spyOn(Imports, 'defer').mockImplementation((..._args: unknown[]) => undefined)
    Loading.overlay = null
    Loading.navbar = null
    init()
  })
  afterEach(() => {
    unmountDom()
  })
  it('should log message to web console', async () => {
    const message = `error message! ${Math.random()}`
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(message)
    expect(consoleError.mock.calls).toEqual([[message]])
  })
  it('should not log null message to web console', async () => {
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(null)
    expect(consoleError.mock.calls.length > 0).toBe(false)
  })
  it('should not log undefined message to web console', async () => {
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(undefined)
    expect(consoleError.mock.calls.length > 0).toBe(false)
  })
  it('should not log empty string message to web console', async () => {
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler('')
    expect(consoleError.mock.calls.length > 0).toBe(false)
  })
  it('should hide loading overlay', async () => {
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Hide')).toBe(true)
  })
  it('should remove css transition style on navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(undefined)
    expect(navbar?.style.getPropertyValue('transition')).toBe('')
  })
  it('should set scary red background navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('background-color')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(undefined)
    expect(navbar?.style.getPropertyValue('background-color')).toBe('rgb(255, 0, 0)')
  })
  it('should set a deferred function', async () => {
    expect(deferStub.mock.calls.length).toBe(0)
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(undefined)
    expect(deferStub.mock.calls.length).toBe(1)
  })
  it('should defer transition definition', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('transition')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(undefined)
    capturedDeferred(deferStub).forEach((fn) => {
      fn()
    })
    expect(navbar?.style.getPropertyValue('transition')).toBe('background-color 2s ease-in-out')
  })
  it('should defer background-color change', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('background-color', '#FFFFFF')
    const handler = capturedSubscriber(subscribeStub, 'Loading:Error')
    await handler(undefined)
    capturedDeferred(deferStub).forEach((fn) => {
      fn()
    })
    expect(navbar?.style.getPropertyValue('background-color')).toBe('')
  })
})
