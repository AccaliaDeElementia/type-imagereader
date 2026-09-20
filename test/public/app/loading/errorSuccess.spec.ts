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

interface OutcomeCase {
  topic: string
  colour: string
  publishesHide: boolean
}

const outcomes: OutcomeCase[] = [
  { topic: 'Loading:Error', colour: 'rgb(255, 0, 0)', publishesHide: true },
  { topic: 'Loading:Success', colour: 'rgb(0, 170, 0)', publishesHide: false },
]

describe.each(outcomes)('public/app/loading subscriber "$topic"', ({ topic, colour, publishesHide }: OutcomeCase) => {
  let publishStub: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let deferStub: MockInstance = vi.fn()
  let dom: JSDOM = new JSDOM('', {})
  let handler = async (_?: unknown): Promise<void> => {
    await Promise.resolve()
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockReturnValue(undefined)
    publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    deferStub = vi.spyOn(Imports, 'defer').mockReturnValue(undefined)
    Loading.overlay = null
    Loading.navbar = null
    init()
    handler = capturedSubscriber(subscribeStub, topic)
  })
  afterEach(() => {
    unmountDom()
  })

  it(
    publishesHide
      ? 'should publish Loading:Hide to dismiss the overlay it is reporting on'
      : 'should not publish Loading:Hide, having only the navbar to flash',
    async () => {
      await handler(undefined)
      expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Hide')).toBe(publishesHide)
    },
  )
  it('should remove css transition style on navbar', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('transition', 'background-color 2s ease-in-out')
    await handler(undefined)
    expect(navbar?.style.getPropertyValue('transition')).toBe('')
  })
  it(`should set the navbar background to ${colour}`, async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('background-color')
    await handler(undefined)
    expect(navbar?.style.getPropertyValue('background-color')).toBe(colour)
  })
  it('should set a deferred function', async () => {
    await handler(undefined)
    expect(deferStub.mock.calls.length).toBe(1)
  })
  it('should defer transition definition', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.removeProperty('transition')
    await handler(undefined)
    capturedDeferred(deferStub).forEach((fn) => {
      fn()
    })
    expect(navbar?.style.getPropertyValue('transition')).toBe('background-color 2s ease-in-out')
  })
  it('should defer background-color change', async () => {
    const navbar = dom.window.document.querySelector<HTMLElement>('#navbar')
    navbar?.style.setProperty('background-color', '#FFFFFF')
    await handler(undefined)
    capturedDeferred(deferStub).forEach((fn) => {
      fn()
    })
    expect(navbar?.style.getPropertyValue('background-color')).toBe('')
  })
})

describe('public/app/loading subscriber "Loading:Error" console reporting', () => {
  let consoleError: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let handler = async (_?: unknown): Promise<void> => {
    await Promise.resolve()
  }
  beforeEach(() => {
    const dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    consoleError = vi.spyOn(global.window.console, 'error').mockReturnValue(undefined)
    resetPubSub()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockReturnValue(undefined)
    vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    vi.spyOn(Imports, 'defer').mockReturnValue(undefined)
    Loading.overlay = null
    Loading.navbar = null
    init()
    handler = capturedSubscriber(subscribeStub, 'Loading:Error')
  })
  afterEach(() => {
    unmountDom()
  })

  it('should log message to web console', async () => {
    const message = `error message! ${Math.random()}`
    await handler(message)
    expect(consoleError.mock.calls).toEqual([[message]])
  })
  const unloggedMessages: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
  ]
  it.each(unloggedMessages)('should not log a %s message to web console', async (_title, message) => {
    await handler(message)
    expect(consoleError.mock.calls.length > 0).toBe(false)
  })
})
