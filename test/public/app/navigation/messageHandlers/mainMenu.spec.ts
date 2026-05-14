'use sanity'

import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Internals, Navigation } from '#public/scripts/app/navigation.js'
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
  let dom = new JSDOM('', {})
  let subscribeStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    vi.spyOn(Internals, 'loadData').mockResolvedValue(undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    vi.spyOn(Imports, 'forward').mockImplementation((..._args: unknown[]) => undefined)
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
  describe('Menu:show Message Handler', () => {
    let menuNode: HTMLDivElement | null = null
    beforeEach(() => {
      menuNode = dom.window.document.querySelector('#mainMenu')
      expect(menuNode).not.toBe(null)
    })
    afterEach(() => {
      menuNode = null
    })
    it('should remove hidden class from main menu node', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Menu:show')
      menuNode?.classList.add('hidden')
      expect(menuNode?.classList.contains('hidden')).toBe(true)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).toBe(false)
    })
    it('should remove hidden class while preserving other classes on main menu node', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Menu:show')
      menuNode?.classList.add('foo')
      menuNode?.classList.add('bar')
      menuNode?.classList.add('hidden')
      menuNode?.classList.add('baz')
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).toBe(false)
    })
    it('should tolerate already removed hidden class on main menu node', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Menu:show')
      expect(menuNode?.classList.contains('hidden')).toBe(false)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).toBe(false)
    })
    it('should tolerate missing main menu node', async () => {
      menuNode?.parentNode?.removeChild(menuNode)
      init()
      const handler = capturedSubscriber(subscribeStub, 'Menu:show')
      menuNode?.classList.add('hidden')
      await eventuallyFulfills(handler(undefined))
    })
  })
  describe('Menu:Hide Message Handler', () => {
    let menuNode: HTMLDivElement | null = null
    beforeEach(() => {
      menuNode = dom.window.document.querySelector('#mainMenu')
      expect(menuNode).not.toBe(null)
    })
    afterEach(() => {
      menuNode = null
    })
    it('should add hidden class from main menu node', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Menu:Hide')
      expect(menuNode?.classList.contains('hidden')).toBe(false)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).toBe(true)
    })
    it('should preserve hidden class on hidden main menu node', async () => {
      init()
      const handler = capturedSubscriber(subscribeStub, 'Menu:Hide')
      menuNode?.classList.add('hidden')
      expect(menuNode?.classList.contains('hidden')).toBe(true)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).toBe(true)
    })
    it('should tolerate missing main menu node', async () => {
      menuNode?.parentElement?.removeChild(menuNode)
      init()
      const handler = capturedSubscriber(subscribeStub, 'Menu:Hide')
      await eventuallyFulfills(handler(undefined))
    })
  })
  describe('#mainMenu Click Handler', () => {
    it('should ignore click event targeting child of #mainMenu', () => {
      init()
      Navigation.current.pictures = [
        {
          name: 'foo',
          path: '/foo.jpg',
          seen: false,
        },
      ]
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      const target = dom.window.document.querySelector('.innerTarget')
      assert(target !== null, 'target must exist')
      Navigation.current.pictures = [{ name: '', path: '', seen: false }]
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(publishStub.mock.calls.length).toBe(0)
    })
    it('should ignore click event node outside of #mainMenu', () => {
      init()
      Navigation.current.pictures = [
        {
          name: 'foo',
          path: '/foo.jpg',
          seen: false,
        },
      ]
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      const target = dom.window.document.querySelector('.navbar-brand')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(publishStub.mock.calls.length).toBe(0)
    })
    it('should ignore click event will missing pictures list', () => {
      init()
      Navigation.current.pictures = undefined
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      const target = dom.window.document.querySelector('#mainMenu')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(publishStub.mock.calls.length).toBe(0)
    })
    it('should ignore click event will empty pictures list', () => {
      init()
      Navigation.current.pictures = []
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      const target = dom.window.document.querySelector('#mainMenu')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(publishStub.mock.calls.length).toBe(0)
    })
    it('should publish hide menu event for click event with pictures', () => {
      init()
      Navigation.current.pictures = [
        {
          name: 'FOO',
          path: '/foo.jpe',
          seen: true,
        },
      ]
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      const target = dom.window.document.querySelector('#mainMenu')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(publishStub.mock.calls.length).toBe(1)
    })
  })
  describe('.menuButton click handler', () => {
    it('should publish Menu:show', () => {
      init()
      const publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
      const target = dom.window.document.querySelector('.menuButton')
      assert(target !== null, 'target must exist')
      Navigation.current.pictures = [{ name: '', path: '', seen: true }]
      const event = new dom.window.MouseEvent('click')
      target.dispatchEvent(event)
      expect(publishStub.mock.calls.length).toBe(1)
    })
  })
})
