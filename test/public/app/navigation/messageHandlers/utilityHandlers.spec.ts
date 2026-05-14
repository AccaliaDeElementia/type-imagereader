'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { init, Internals, Imports, Navigation } from '#public/scripts/app/navigation.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

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
describe('public/app/navigation/messageHandlers init()', () => {
  let dom = new JSDOM('', {})
  let subscribeStub: MockInstance = vi.fn()
  let forwardStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    vi.spyOn(Internals, 'loadData').mockResolvedValue(undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    forwardStub = vi.spyOn(Imports, 'forward').mockImplementation((..._args: unknown[]) => undefined)
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(() => {
    unmountDom()
    vi.restoreAllMocks()
  })
  describe('Action:Execute:Slideshow Message Handler', () => {
    let locationAssignSpy: MockInstance = vi.fn()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      init()
      locationAssignSpy = vi.fn()
      Navigation.locationAssign = cast<(url: string | URL) => void>(locationAssignSpy)
      handler = capturedSubscriber(subscribeStub, 'Action:Execute:Slideshow')
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })
    it('should alter location via locationAssign when invoked', async () => {
      await handler()
      expect(locationAssignSpy.mock.calls.length).toBe(1)
    })
    it('should alter location to expected path when invoked', async () => {
      const path = `/foo/${Math.random()}`
      Navigation.current.path = path
      await handler()
      expect(locationAssignSpy.mock.calls[0]?.[0]).toBe(`/slideshow${path}`)
    })
    it('should pass expected this value when invoked', async () => {
      await handler()
      expect(locationAssignSpy.mock.contexts[0]).toBe(dom.window.location)
    })
  })
  describe('Action:Execute:Fullscreen Message Handler', () => {
    const requestFullscreenStub = vi.fn()
    const exitFullscreenStub = vi.fn()
    let publishStub: MockInstance = vi.fn()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      init()
      requestFullscreenStub.mockResolvedValue(undefined)
      exitFullscreenStub.mockResolvedValue(undefined)
      dom.window.document.body.requestFullscreen = requestFullscreenStub
      dom.window.document.exitFullscreen = exitFullscreenStub
      handler = capturedSubscriber(subscribeStub, 'Action:Execute:FullScreen')
      publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    })
    afterEach(() => {
      requestFullscreenStub.mockReset()
      exitFullscreenStub.mockReset()
    })
    it('should call requestFullscreen once when no fullscreen element exists', async () => {
      await handler()
      expect(requestFullscreenStub.mock.calls.length).toBe(1)
    })
    it('should not call exitFullscreen when no fullscreen element exists', async () => {
      await handler()
      expect(exitFullscreenStub.mock.calls.length).toBe(0)
    })
    it('should request fullscreen with one argument', async () => {
      await handler()
      expect(requestFullscreenStub.mock.calls[0]).toHaveLength(1)
    })
    it('should request fullscreen without navigationUI', async () => {
      await handler()
      expect(requestFullscreenStub.mock.calls[0]?.[0]).toEqual({ navigationUI: 'hide' })
    })
    it('should not publish Loading:Error when requestFullscreen resolves', async () => {
      requestFullscreenStub.mockResolvedValue(undefined)
      await handler()
      expect(publishStub.mock.calls.length > 0).toBe(false)
    })
    it('should publish Loading:Error when requestFullscreen rejects', async () => {
      requestFullscreenStub.mockRejectedValue('FOO')
      await handler()
      expect(publishStub.mock.calls.length > 0).toBe(true)
    })
    it('should pass exception to Loading:Error when requestFullscreen rejects', async () => {
      const err = new Error('FOO')
      requestFullscreenStub.mockRejectedValue(err)
      await handler()
      expect(publishStub.mock.calls[0]?.[1]).toBe(err)
    })
    it('should not call requestFullscreen when fullscreen element exists', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      await handler()
      expect(requestFullscreenStub.mock.calls.length).toBe(0)
    })
    it('should call exitFullscreen once when fullscreen element exists', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      await handler()
      expect(exitFullscreenStub.mock.calls.length).toBe(1)
    })
    it('should not publish Loading:Error when exitFullscreen resolves', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      exitFullscreenStub.mockResolvedValue(undefined)
      await handler()
      expect(publishStub.mock.calls.length > 0).toBe(false)
    })
    it('should publish Loading:Error when exitFullscreen rejects', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      exitFullscreenStub.mockRejectedValue('FOO')
      await handler()
      expect(publishStub.mock.calls.length > 0).toBe(true)
    })
    it('should pass exception to Loading:Error when exitFullscreen rejects', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      const err = new Error('FOO')
      exitFullscreenStub.mockRejectedValue(err)
      await handler()
      expect(publishStub.mock.calls[0]?.[1]).toBe(err)
    })
  })
  describe('Message Forwarding Configuration', () => {
    beforeEach(() => {
      init()
    })
    const mappers: Array<[string, string]> = [
      ['Action:Execute:ShowMenu', 'Menu:show'],
      ['Action:Execute:HideMenu', 'Menu:Hide'],
      ['Action:Keypress:<Ctrl>ArrowUp', 'Action:Execute:ParentFolder'],
      ['Action:Keypress:<Ctrl>ArrowDown', 'Action:Execute:FirstUnfinished'],
      ['Action:Keypress:<Ctrl>ArrowLeft', 'Action:Execute:PreviousFolder'],
      ['Action:Keypress:<Ctrl>ArrowRight', 'Action:Execute:NextFolder'],
      ['Action:Gamepad:Down', 'Action:Execute:PreviousFolder'],
      ['Action:Gamepad:Up', 'Action:Execute:NextFolder'],
      ['Action:Gamepad:North', 'Action:Execute:ParentFolder'],
      ['Action:Gamepad:East', 'Action:Execute:FirstUnfinished'],
    ]
    mappers.forEach(([from, to]) => {
      it(`should register forward from ${from} to ${to}`, () => {
        expect(forwardStub.mock.calls.some((c) => c[0] === from, to)).toBe(true)
      })
    })
  })
})
