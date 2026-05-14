'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import type { Listing } from '#contracts/listing.js'
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
  let loadDataStub: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    loadDataStub = vi.spyOn(Internals, 'loadData').mockResolvedValue(undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    vi.spyOn(Imports, 'forward').mockImplementation((..._args: unknown[]) => undefined)
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
  describe('Navigate:Load Handler', () => {
    it('should set current location when passed string', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler('a string')
      expect(Navigation.current).toEqual({
        path: 'a string',
        name: '',
        parent: '',
      })
    })
    it('should set current location when passed Listing', async () => {
      const data: Listing = {
        path: '/foo/bar/baz',
        name: 'Baz',
        parent: '/foo/bar',
      }
      init()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler(data)
      expect(Navigation.current).toBe(data)
    })
    it('should retain current location when passed invalid data', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      Navigation.current.path = '/foo/bar/bax/42'
      await handler(null)
      expect(Navigation.current.path).toBe('/foo/bar/bax/42')
    })
    it('should not load data when passed invalid data', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      loadDataStub.mockClear()
      await handler(null)
      expect(loadDataStub.mock.calls.length).toBe(0)
    })
    it('should tolerate loadData() rejecting', async () => {
      init()
      loadDataStub.mockClear()
      loadDataStub.mockRejectedValue(new Event('FOO!'))
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      const catcher = (): never => expect.fail('Handler should not reject!')
      await handler('a string').catch(catcher)
    })
    it('should call loadData() once with defaults', async () => {
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler('a string')
      expect(loadDataStub.mock.calls.length).toBe(1)
    })
    it('should call loadData() with noHistory=false for string path', async () => {
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler('a string')
      expect(loadDataStub.mock.calls[0]?.[0]).toBe(false)
    })
    it('should call loadData() with suppressMenu=false for string path', async () => {
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler('a string')
      expect(loadDataStub.mock.calls[0]?.[1]).toBe(false)
    })
    it('should call loadData() with suppressMenu=true when listing has noMenu=true', async () => {
      const data: Listing = {
        path: '/foo/bar/baz',
        name: 'Baz',
        parent: '/foo/bar',
        noMenu: true,
      }
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler(data)
      expect(loadDataStub.mock.calls[0]?.[1]).toBe(true)
    })
    it('should call loadData() with suppressMenu=false when listing has noMenu=false', async () => {
      const data: Listing = {
        path: '/foo/bar/baz',
        name: 'Baz',
        parent: '/foo/bar',
        noMenu: false,
      }
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler(data)
      expect(loadDataStub.mock.calls[0]?.[1]).toBe(false)
    })
    it('should call loadData() with suppressMenu=false when listing has no noMenu key', async () => {
      const data: Listing = {
        path: '/foo/bar/baz',
        name: 'Baz',
        parent: '/foo/bar',
      }
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Load')
      await handler(data)
      expect(loadDataStub.mock.calls[0]?.[1]).toBe(false)
    })
  })
  describe('Navigate:Reload Message Handler', () => {
    it('should call loadData() once', async () => {
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Reload')
      await handler('a string')
      expect(loadDataStub.mock.calls.length).toBe(1)
    })
    it('should call loadData() with no arguments', async () => {
      init()
      loadDataStub.mockClear()
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Reload')
      await handler('a string')
      expect(loadDataStub.mock.calls[0]).toEqual([])
    })
    it('should tolerate loadData() rejecting', async () => {
      init()
      loadDataStub.mockClear()
      loadDataStub.mockRejectedValue(new Event('FOO!'))
      const handler = capturedSubscriber(subscribeStub, 'Navigate:Reload')
      const catcher = (): never => expect.fail('Handler should not reject!')
      await handler('a string').catch(catcher)
    })
  })
  describe('window.popstate event Handler', () => {
    it('should register popstate listener that sets current when triggered', () => {
      dom.reconfigure({
        url: 'http://type-imagereader.example.com/show/quux',
      })
      init()
      Navigation.current = {
        path: '/',
        name: 'WRONG NAME',
        parent: 'FOOOO',
      }
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(Navigation.current).toEqual({
        path: '/quux',
        name: '',
        parent: '',
      })
    })
    it('should register popstate listener that tolerates loadData rejecting', () => {
      init()
      loadDataStub.mockClear()
      loadDataStub.mockRejectedValue(new Event('FOO!'))
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(loadDataStub.mock.calls.length).toBe(1)
    })
    it('should register popstate listener that calls loadData once with no history flag set', () => {
      init()
      loadDataStub.mockClear()
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(loadDataStub.mock.calls.length).toBe(1)
    })
    it('should register popstate listener that calls loadData with no history flag set', () => {
      init()
      loadDataStub.mockClear()
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(loadDataStub.mock.calls[0]).toEqual([true])
    })
  })
  describe('Navigate:Data Message Handler', () => {
    let consoleLogSpy: MockInstance = vi.fn()
    beforeEach(() => {
      consoleLogSpy = vi.spyOn(global.window.console, 'log').mockImplementation((..._args: unknown[]) => undefined)
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })
    const testCases: Array<[string, unknown, boolean]> = [
      ['null', null, false],
      ['undefined', undefined, false],
      ['empty string', '', false],
      ['number', 3.1415926, true],
      ['boolean', false, true],
      ['string', 'Foo bar baz', true],
      ['object', { foo: 'bar' }, true],
      ['array', [1, false, 'apple'], true],
      ['listing', { path: '/foo/bar/baz', name: 'baz', parent: '/foo/bar' }, true],
    ]
    testCases.forEach(([name, data, expected]) => {
      it(`should${expected ? '' : ' not'} log data when passed ${name}`, async () => {
        init()
        loadDataStub.mockClear()
        const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
        await handler(data)
        expect(consoleLogSpy.mock.calls.length > 0).toBe(expected)
      })
    })
    testCases
      .filter(([, , expected]) => expected)
      .forEach(([name, data]) => {
        it(`should log data with one argument when passed ${name}`, async () => {
          init()
          loadDataStub.mockClear()
          const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
          await handler(data)
          expect(consoleLogSpy.mock.calls[0]).toHaveLength(1)
        })
        it(`should log data value when passed ${name}`, async () => {
          init()
          loadDataStub.mockClear()
          const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
          await handler(data)
          expect(consoleLogSpy.mock.calls[0]?.[0]).toBe(data)
        })
      })
  })
})
