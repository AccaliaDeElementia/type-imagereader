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
describe('public/app/navigation/messageHandlers action-to-topic forwarding handlers', () => {
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
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockReturnValue(undefined)
    forwardStub = vi.spyOn(Imports, 'forward').mockReturnValue(undefined)
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
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
      publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
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
    it('should not publish when requestFullscreen resolves', async () => {
      requestFullscreenStub.mockResolvedValue(undefined)
      await handler()
      expect(publishStub.mock.calls.length > 0).toBe(false)
    })
    it('should publish to Fullscreen:Error when requestFullscreen rejects', async () => {
      requestFullscreenStub.mockRejectedValue('FOO')
      await handler()
      expect(publishStub.mock.calls[0]?.[0]).toBe('Fullscreen:Error')
    })
    it('should pass exception to Fullscreen:Error when requestFullscreen rejects', async () => {
      const err = new Error('FOO')
      requestFullscreenStub.mockRejectedValue(err)
      await handler()
      expect(publishStub.mock.calls[0]?.[1]).toBe(err)
    })
    it('should set fullscreenIntent to enter before calling requestFullscreen', async () => {
      let intentAtCallTime: typeof Navigation.fullscreenIntent = 'none'
      requestFullscreenStub.mockImplementation(async () => {
        intentAtCallTime = Navigation.fullscreenIntent
        await Promise.resolve()
      })
      await handler()
      expect(intentAtCallTime).toBe('enter')
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
    it('should not publish when exitFullscreen resolves', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      exitFullscreenStub.mockResolvedValue(undefined)
      await handler()
      expect(publishStub.mock.calls.length > 0).toBe(false)
    })
    it('should publish to Fullscreen:Error when exitFullscreen rejects', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      exitFullscreenStub.mockRejectedValue('FOO')
      await handler()
      expect(publishStub.mock.calls[0]?.[0]).toBe('Fullscreen:Error')
    })
    it('should pass exception to Fullscreen:Error when exitFullscreen rejects', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      const err = new Error('FOO')
      exitFullscreenStub.mockRejectedValue(err)
      await handler()
      expect(publishStub.mock.calls[0]?.[1]).toBe(err)
    })
    it('should set fullscreenIntent to exit before calling exitFullscreen', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      let intentAtCallTime: typeof Navigation.fullscreenIntent = 'none'
      exitFullscreenStub.mockImplementation(async () => {
        intentAtCallTime = Navigation.fullscreenIntent
        await Promise.resolve()
      })
      await handler()
      expect(intentAtCallTime).toBe('exit')
    })
  })
  describe('Fullscreen observability listeners', () => {
    let addEventListenerSpy: MockInstance = vi.fn()
    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(dom.window.document, 'addEventListener')
      init()
    })
    it('should register a fullscreenchange listener on document', () => {
      expect(addEventListenerSpy.mock.calls.some((c) => c[0] === 'fullscreenchange')).toBe(true)
    })
    it('should register a fullscreenerror listener on document', () => {
      expect(addEventListenerSpy.mock.calls.some((c) => c[0] === 'fullscreenerror')).toBe(true)
    })
    it('should dispatch fullscreenchange to Internals.onFullscreenChange', () => {
      const onFullscreenChangeSpy = vi.spyOn(Internals, 'onFullscreenChange').mockReturnValue(undefined)
      const change = cast<(event: Event) => void>(
        addEventListenerSpy.mock.calls.find((c) => c[0] === 'fullscreenchange')?.[1],
      )
      change(cast<Event>({}))
      expect(onFullscreenChangeSpy.mock.calls.length).toBe(1)
    })
    it('should dispatch fullscreenerror to Internals.onFullscreenError', () => {
      const onFullscreenErrorSpy = vi.spyOn(Internals, 'onFullscreenError').mockReturnValue(undefined)
      const fail = cast<(event: Event) => void>(
        addEventListenerSpy.mock.calls.find((c) => c[0] === 'fullscreenerror')?.[1],
      )
      const event = cast<Event>({ type: 'fullscreenerror' })
      fail(event)
      expect(onFullscreenErrorSpy.mock.calls[0]?.[0]).toBe(event)
    })
  })
  describe('Internals.onFullscreenChange', () => {
    let publishStub: MockInstance = vi.fn()
    beforeEach(() => {
      init()
      publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
      Navigation.fullscreenIntent = 'none'
    })
    it('should publish Fullscreen:Change on transition', () => {
      Internals.onFullscreenChange()
      expect(publishStub.mock.calls.some((c) => c[0] === 'Fullscreen:Change')).toBe(true)
    })
    it('should include active=true in Fullscreen:Change payload when fullscreenElement set', () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      Internals.onFullscreenChange()
      const payload = cast<{ active: boolean }>(publishStub.mock.calls.find((c) => c[0] === 'Fullscreen:Change')?.[1])
      expect(payload.active).toBe(true)
    })
    it('should include active=false in Fullscreen:Change payload when no fullscreenElement', () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: null,
      })
      Internals.onFullscreenChange()
      const payload = cast<{ active: boolean }>(publishStub.mock.calls.find((c) => c[0] === 'Fullscreen:Change')?.[1])
      expect(payload.active).toBe(false)
    })
    it('should include captured intent in Fullscreen:Change payload', () => {
      Navigation.fullscreenIntent = 'enter'
      Internals.onFullscreenChange()
      const payload = cast<{ intent: string }>(publishStub.mock.calls.find((c) => c[0] === 'Fullscreen:Change')?.[1])
      expect(payload.intent).toBe('enter')
    })
    it('should reset fullscreenIntent to none after handling', () => {
      Navigation.fullscreenIntent = 'enter'
      Internals.onFullscreenChange()
      expect(Navigation.fullscreenIntent).toBe('none')
    })
    it('should publish Fullscreen:UnexpectedExit on exit without exit intent', () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: null,
      })
      Navigation.fullscreenIntent = 'none'
      Internals.onFullscreenChange()
      expect(publishStub.mock.calls.some((c) => c[0] === 'Fullscreen:UnexpectedExit')).toBe(true)
    })
    it('should not publish Fullscreen:UnexpectedExit when intent is exit', () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: null,
      })
      Navigation.fullscreenIntent = 'exit'
      Internals.onFullscreenChange()
      expect(publishStub.mock.calls.some((c) => c[0] === 'Fullscreen:UnexpectedExit')).toBe(false)
    })
    it('should not publish Fullscreen:UnexpectedExit when entering fullscreen', () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      Navigation.fullscreenIntent = 'enter'
      Internals.onFullscreenChange()
      expect(publishStub.mock.calls.some((c) => c[0] === 'Fullscreen:UnexpectedExit')).toBe(false)
    })
  })
  describe('Internals.onFullscreenError', () => {
    let publishStub: MockInstance = vi.fn()
    beforeEach(() => {
      init()
      publishStub = vi.spyOn(Imports, 'publish').mockReturnValue(undefined)
    })
    it('should publish Fullscreen:Error', () => {
      Internals.onFullscreenError(cast<Event>({ type: 'fullscreenerror' }))
      expect(publishStub.mock.calls.some((c) => c[0] === 'Fullscreen:Error')).toBe(true)
    })
    it('should forward the event in the Fullscreen:Error payload', () => {
      const event = cast<Event>({ type: 'fullscreenerror' })
      Internals.onFullscreenError(event)
      expect(publishStub.mock.calls.find((c) => c[0] === 'Fullscreen:Error')?.[1]).toBe(event)
    })
  })
  describe('Diagnostic Sink Subscribers', () => {
    let sendDiagnosticStub: MockInstance = vi.fn()
    beforeEach(() => {
      sendDiagnosticStub = vi.spyOn(Imports, 'sendDiagnostic').mockResolvedValue(undefined)
      init()
    })
    const sinkTopics = ['Fullscreen:Change', 'Fullscreen:Error', 'Fullscreen:UnexpectedExit']
    sinkTopics.forEach((topic) => {
      it(`should forward ${topic} to sendDiagnostic`, async () => {
        const handler = capturedSubscriber(subscribeStub, topic)
        await handler({ marker: Math.random() })
        expect(sendDiagnosticStub.mock.calls.some((c) => c[0] === topic)).toBe(true)
      })
      it(`should forward ${topic} payload to sendDiagnostic`, async () => {
        const handler = capturedSubscriber(subscribeStub, topic)
        const payload = { marker: Math.random() }
        await handler(payload)
        expect(sendDiagnosticStub.mock.calls.find((c) => c[0] === topic)?.[1]).toBe(payload)
      })
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
      ['Action:Gamepad:West', 'Action:Execute:FullScreen'],
    ]
    mappers.forEach(([from, to]) => {
      it(`should register forward from ${from} to ${to}`, () => {
        expect(forwardStub.mock.calls.some((c) => c[0] === from, to)).toBe(true)
      })
    })
  })
})
