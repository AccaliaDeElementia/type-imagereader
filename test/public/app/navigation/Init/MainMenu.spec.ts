'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../testutils/TypeGuards'
import { EventuallyFullfills } from '../../../../testutils/Errors'

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
describe('public/app/navigation Init() MainMenu Handlers', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []
    tabSelectedSpy.resolves()
    PubSub.Subscribe('Tab:Selected', tabSelectedSpy)
    loadDataStub = Sinon.stub(Navigation, 'LoadData').resolves()
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
  })
  afterEach(() => {
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
  })
  describe('Menu:Show Message Handler', () => {
    let menuNode: HTMLDivElement | null = null
    beforeEach(() => {
      menuNode = dom.window.document.querySelector('#mainMenu')
      expect(menuNode).to.not.equal(null)
    })
    afterEach(() => {
      menuNode = null
    })
    it('should remove hidden class from main menu node', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:SHOW']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      menuNode?.classList.add('hidden')
      expect(menuNode?.classList.contains('hidden')).to.equal(true)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).to.equal(false)
    })
    it('should preserve other class on main menu node', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:SHOW']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      menuNode?.classList.add('foo')
      menuNode?.classList.add('bar')
      menuNode?.classList.add('hidden')
      menuNode?.classList.add('baz')
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).to.equal(false)
      expect(menuNode?.classList.contains('foo')).to.equal(true)
      expect(menuNode?.classList.contains('bar')).to.equal(true)
      expect(menuNode?.classList.contains('baz')).to.equal(true)
    })
    it('should tolerate already removed hidden class on main menu node', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:SHOW']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      expect(menuNode?.classList.contains('hidden')).to.equal(false)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).to.equal(false)
    })
    it('should tolerate missing main menu node', async () => {
      menuNode?.parentNode?.removeChild(menuNode)
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:SHOW']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      menuNode?.classList.add('hidden')
      await EventuallyFullfills(handler(undefined))
    })
  })
  describe('Menu:Hide Message Handler', () => {
    let menuNode: HTMLDivElement | null = null
    beforeEach(() => {
      menuNode = dom.window.document.querySelector('#mainMenu')
      expect(menuNode).to.not.equal(null)
    })
    afterEach(() => {
      menuNode = null
    })
    it('should add hidden class from main menu node', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:HIDE']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      expect(menuNode?.classList.contains('hidden')).to.equal(false)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).to.equal(true)
    })
    it('should preserve hidden class on hidden main menu node', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:HIDE']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      menuNode?.classList.add('hidden')
      expect(menuNode?.classList.contains('hidden')).to.equal(true)
      await handler(undefined)
      expect(menuNode?.classList.contains('hidden')).to.equal(true)
    })
    it('should preserve other class on hidden main menu node', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:HIDE']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      menuNode?.classList.add('foo')
      menuNode?.classList.add('bar')
      menuNode?.classList.add('baz')
      await handler(undefined)
      expect(menuNode?.classList.contains('foo')).to.equal(true)
      expect(menuNode?.classList.contains('bar')).to.equal(true)
      expect(menuNode?.classList.contains('baz')).to.equal(true)
    })
    it('should tolerate missing main menu node', async () => {
      menuNode?.parentElement?.removeChild(menuNode)
      Navigation.Init()
      const handler = PubSub.subscribers['MENU:HIDE']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await EventuallyFullfills(handler(undefined))
    })
  })
  describe('#mainMenu Click Handler', () => {
    it('should ignore click event targeting child of #mainMenu', () => {
      Navigation.Init()
      Navigation.current.pictures = [
        {
          name: 'foo',
          path: '/foo.jpg',
          seen: false,
        },
      ]
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['MENU:HIDE'] = [spy]
      const target = dom.window.document.querySelector('.innerTarget')
      assert(target !== null, 'target must exist')
      Navigation.current.pictures = [{ name: '', path: '', seen: false }]
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(spy.callCount).to.equal(0)
    })
    it('should ignore click event node outside of #mainMenu', () => {
      Navigation.Init()
      Navigation.current.pictures = [
        {
          name: 'foo',
          path: '/foo.jpg',
          seen: false,
        },
      ]
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['MENU:HIDE'] = [spy]
      const target = dom.window.document.querySelector('.navbar-brand')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(spy.callCount).to.equal(0)
    })
    it('should ignore click event will missing pictures list', () => {
      Navigation.Init()
      Navigation.current.pictures = undefined
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['MENU:HIDE'] = [spy]
      const target = dom.window.document.querySelector('#mainMenu')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(spy.callCount).to.equal(0)
    })
    it('should ignore click event will empty pictures list', () => {
      Navigation.Init()
      Navigation.current.pictures = undefined
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['MENU:HIDE'] = [spy]
      const target = dom.window.document.querySelector('#mainMenu')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(spy.callCount).to.equal(0)
    })
    it('should publish hide menu event for click event with pictures', () => {
      Navigation.Init()
      Navigation.current.pictures = [
        {
          name: 'FOO',
          path: '/foo.jpe',
          seen: true,
        },
      ]
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['MENU:HIDE'] = [spy]
      const target = dom.window.document.querySelector('#mainMenu')
      assert(target !== null, 'target must exist')
      const event = new dom.window.MouseEvent('click', { bubbles: true })
      target.dispatchEvent(event)
      expect(spy.callCount).to.equal(1)
    })
  })
  describe('.menuButton click handler', () => {
    it('should publish Menu:Show', () => {
      Navigation.Init()
      const spy = Sinon.stub().resolves()
      PubSub.subscribers['MENU:SHOW'] = [spy]
      const target = dom.window.document.querySelector('.menuButton')
      assert(target !== null, 'target must exist')
      Navigation.current.pictures = [{ name: '', path: '', seen: true }]
      const event = new dom.window.MouseEvent('click')
      target.dispatchEvent(event)
      expect(spy.callCount).to.equal(1)
    })
  })
})
