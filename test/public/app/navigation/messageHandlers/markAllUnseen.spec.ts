'use sanity'

import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { cast } from '#testutils/typeGuards.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { eventuallyFulfills } from '#testutils/errors.js'
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
  let loadDataStub: MockInstance = vi.fn()
  beforeEach(() => {
    const dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' })
    mountDom(dom)
    resetPubSub()
    loadDataStub = vi.spyOn(Internals, 'loadData').mockResolvedValue(undefined)
    Navigation.current = { path: '/', name: '', parent: '' }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(() => {
    unmountDom()
    vi.restoreAllMocks()
  })
  describe('Action:Execute:MarkAllUnseen Message Handler', () => {
    let postJSONSpy = vi.fn().mockResolvedValue(undefined)
    let publishStub: MockInstance = vi.fn()
    let subscribeStub: MockInstance = vi.fn()
    let confirmShowStub = vi.fn().mockResolvedValue(true)
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      postJSONSpy = vi.spyOn(Imports, 'postJSON').mockResolvedValue(undefined)
      confirmShowStub = vi.spyOn(Imports, 'show').mockResolvedValue(true)
      subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
      vi.spyOn(Imports, 'forward').mockImplementation((..._args: unknown[]) => undefined)
      init()
      loadDataStub.mockClear()
      handler = capturedSubscriber(subscribeStub, 'Action:Execute:MarkAllUnseen')
      publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })
    it('should post to mark unread API endpoint', async () => {
      await handler()
      expect(postJSONSpy.mock.calls[0]?.[0]).toBe('/api/mark/unread')
    })
    it('should post expected payload to mark unread API endpoint', async () => {
      const path = `/foo/bar/${Math.random()}`
      Navigation.current.path = path
      await handler()
      expect(postJSONSpy.mock.calls[0]?.[1]).toEqual({ path })
    })
    const payloadTests: Array<[string, unknown]> = [
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
      ['string', 'foo!'],
      ['boolean false', false],
      ['boolean true', true],
      ['number', 6.2867],
      ['empty object', {}],
      ['object', { a: 1 }],
      ['empty array', []],
      ['array', ['a', 5, assert, {}]],
      ['Listing', { name: 'foo', path: '/foo', parent: '/' }],
    ]
    payloadTests.forEach(([name, data]) => {
      it(`should provide a function as validator for ${name} result from postJSON`, async () => {
        await handler()
        const fn = cast<(o: unknown) => boolean>(postJSONSpy.mock.calls[0]?.[2])
        expect(fn).toBeTypeOf('function')
      })
      it(`should accept ${name} as result from postJSON`, async () => {
        await handler()
        const fn = cast<(o: unknown) => boolean>(postJSONSpy.mock.calls[0]?.[2])
        expect(fn(data)).toBe(true)
      })
    })
    it('should call loadData once after postJSON resolves', async () => {
      await handler()
      expect(loadDataStub.mock.calls.length).toBe(1)
    })
    it('should call loadData after (not before) postJSON resolves', async () => {
      await handler()
      expect(
        (loadDataStub.mock.invocationCallOrder.at(-1) ?? -1) > (postJSONSpy.mock.invocationCallOrder.at(-1) ?? -1),
      ).toBe(true)
    })
    it('should call loadData with one argument in no history mode', async () => {
      await handler()
      expect(loadDataStub.mock.calls[0]).toHaveLength(1)
    })
    it('should call loadData with true in no history mode', async () => {
      await handler()
      expect(loadDataStub.mock.calls[0]?.[0]).toBe(true)
    })
    it('should not publish LoadingError when postJSON resolves', async () => {
      postJSONSpy.mockResolvedValue(undefined)
      await handler()
      expect(publishStub.mock.calls.length).toBe(0)
    })
    it('should publish LoadingError when postJSON rejects', async () => {
      postJSONSpy.mockRejectedValue('FOO')
      await handler()
      expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(true)
    })
    it('should publish LoadingError with exception when postJSON rejects', async () => {
      const err = new Error('FOO')
      postJSONSpy.mockRejectedValue(err)
      await handler()
      expect(publishStub.mock.calls[0]?.[1]).toBe(err)
    })
    it('should not call loadData if postJSON rejects', async () => {
      postJSONSpy.mockRejectedValue('FOO')
      await handler()
      expect(loadDataStub.mock.calls.length > 0).toBe(false)
    })
    it('should swallow exception when loadData rejects', async () => {
      loadDataStub.mockRejectedValue('FOO')
      await eventuallyFulfills(handler())
    })
    it('should call Confirm.show once', async () => {
      await handler()
      expect(confirmShowStub.mock.calls.length).toBe(1)
    })
    it('should call Confirm.show with a non-empty string message', async () => {
      await handler()
      expect(confirmShowStub.mock.calls[0]?.[0]).toSatisfy(
        (v: unknown): v is string => typeof v === 'string' && v.length > 0,
      )
    })
    it('should not call postJSON when Confirm.show resolves false', async () => {
      confirmShowStub.mockResolvedValue(false)
      await handler()
      expect(postJSONSpy.mock.calls.length).toBe(0)
    })
    it('should not call loadData when Confirm.show resolves false', async () => {
      confirmShowStub.mockResolvedValue(false)
      await handler()
      expect(loadDataStub.mock.calls.length).toBe(0)
    })
    it('should call postJSON when Confirm.show resolves true', async () => {
      confirmShowStub.mockResolvedValue(true)
      await handler()
      expect(postJSONSpy.mock.calls.length).toBe(1)
    })
  })
})
