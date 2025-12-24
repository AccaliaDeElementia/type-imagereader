'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'
import type { Listing } from '../../../../contracts/listing'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { Net } from '../../../../public/scripts/app/net'
import { EventuallyFullfills, EventuallyRejects } from '../../../testutils/Errors'

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
describe('public/app/navigation function Init()', () => {
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
  it('should set path of current data on Init', () => {
    dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    Navigation.Init()
    expect(Navigation.current.path).to.equal('/foo/bar/baz')
  })
  it('should set path of current data on Init', () => {
    dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    Navigation.Init()
    expect(Navigation.current.path).to.equal('/foo/bar/baz')
  })
  it('should execute LoadData with defaults', () => {
    Navigation.Init()
    expect(loadDataStub.callCount).to.equal(1)
    expect(loadDataStub.firstCall.args).to.deep.equal([])
  })
  it('should tolerate LoadData rejecting', async () => {
    loadDataStub.rejects('FOO!')
    Navigation.Init()
    await Promise.resolve()
    expect(loadDataStub.callCount).to.equal(1)
  })
  const subscribers = [
    'Navigate:Data',
    'Navigate:Load',
    'Navigate:Reload',
    'Menu:Show',
    'Menu:Hide',
    'Tab:Selected',
    'Action:Execute:PreviousFolder',
    'Action:Execute:NextFolder',
    'Action:Execute:ParentFolder',
    'Action:Execute:FirstUnfinished',
    'Action:Execute:ShowMenu',
    'Action:Execute:HideMenu',
    'Action:Execute:MarkAllSeen',
    'Action:Execute:MarkAllUnseen',
    'Action:Execute:Slideshow',
    'Action:Execute:FullScreen',
    'Action:Keypress:<Ctrl>ArrowUp',
    'Action:Keypress:<Ctrl>ArrowDown',
    'Action:Keypress:<Ctrl>ArrowLeft',
    'Action:Keypress:<Ctrl>ArrowRight',
    'Action:Gamepad:Down',
    'Action:Gamepad:Up',
    'Action:Gamepad:Y',
    'Action:Gamepad:A',
  ]
  it('should have expected subscriber list', () => {
    Navigation.Init()
    const subs = subscribers.map((s) => s.toUpperCase())
    expect(PubSub.subscribers).to.have.all.keys(subs)
    expect(Object.keys(PubSub.subscribers)).to.have.lengthOf(subs.length)
  })
  subscribers.forEach((subscriber) => {
    it(`should subscribe to ${subscriber}`, () => {
      Navigation.Init()
      expect(PubSub.subscribers).to.have.any.keys(subscriber.toUpperCase())
      expect(PubSub.subscribers[subscriber.toUpperCase()]).to.have.lengthOf(1)
    })
  })
  describe('Navigate:Load Handler', () => {
    it('should set current location when passed string', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler('a string')
      expect(Navigation.current).to.deep.equal({
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
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler(data)
      expect(Navigation.current).to.equal(data)
    })
    it('should retain current location when passed invalid data', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      Navigation.current.path = '/foo/bar/bax/42'
      await handler(null)
      expect(Navigation.current.path).to.equal('/foo/bar/bax/42')
    })
    it('should not load data when passed invalid data', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      loadDataStub.resetHistory()
      await handler(null)
      expect(loadDataStub.callCount).to.equal(0)
    })
    it('should tolerate LoadData() rejecting', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      loadDataStub.rejects(new Event('FOO!'))
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      const catcher = (): never => expect.fail('Handler should not reject!')
      await handler('a string').catch(catcher)
    })
    it('should call LoadData() with defaults', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler('a string')
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.firstCall.args).to.deep.equal([])
    })
  })
  describe('Navigate:Reload Message Handler', () => {
    it('should call LoadData()', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      const handler = PubSub.subscribers['NAVIGATE:RELOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler('a string')
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.firstCall.args).to.deep.equal([])
    })
    it('should tolerate LoadData() rejecting', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      loadDataStub.rejects(new Event('FOO!'))
      const handler = PubSub.subscribers['NAVIGATE:RELOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      const catcher = (): never => expect.fail('Handler should not reject!')
      await handler('a string').catch(catcher)
    })
  })
  describe('window.popstate event Handler', () => {
    it('should register popstate listener that sets current when triggered', () => {
      dom.reconfigure({
        url: 'http://type-imagereader.example.com/show/quux',
      })
      Navigation.Init()
      Navigation.current = {
        path: '/',
        name: 'WRONG NAME',
        parent: 'FOOOO',
      }
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(Navigation.current).to.deep.equal({
        path: '/quux',
        name: '',
        parent: '',
      })
    })
    it('should register popstate listener that tolerates LoadData rejecting', () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      loadDataStub.rejects(new Event('FOO!'))
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(loadDataStub.callCount).to.equal(1)
    })
    it('should register popstate listener that calls LoadData with no history flag set', () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.firstCall.args).to.deep.equal([true])
    })
  })
  describe('Navigate:Data Message Handler', () => {
    let consoleLogSpy = Sinon.stub()
    beforeEach(() => {
      consoleLogSpy = Sinon.stub(global.window.console, 'log')
    })
    afterEach(() => {
      consoleLogSpy.restore()
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
        Navigation.Init()
        loadDataStub.resetHistory()
        const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
        assert(handler !== undefined, 'handler must have a value')
        await handler(data)
        expect(consoleLogSpy.called).to.equal(expected)
        if (expected) {
          expect(consoleLogSpy.firstCall.args).to.have.lengthOf(1)
          expect(consoleLogSpy.firstCall.args[0]).to.equal(data)
        }
      })
    })
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
  describe('Action:Execute:PreviousFolder message Handler', () => {
    let navigateToStub = Sinon.stub()
    let showUnreadOnlyStub = Sinon.stub()
    let previousFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let previousUnreadFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      showUnreadOnlyStub = Sinon.stub(Pictures, 'GetShowUnreadOnly').returns(false)
      Navigation.Init()
      previousFolder = {
        name: `Foo ${Math.random()}`,
        path: `/Foo ${Math.random()}`,
        cover: `/Foo ${Math.random()}/bar.jpg`,
      }
      previousUnreadFolder = {
        name: `Bar ${Math.random()}`,
        path: `/Bar ${Math.random()}`,
        cover: `/Bar ${Math.random()}/baz.jpg`,
      }
      Navigation.current.prev = previousFolder
      Navigation.current.prevUnread = previousUnreadFolder
      const h = PubSub.subscribers['ACTION:EXECUTE:PREVIOUSFOLDER']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
      showUnreadOnlyStub.restore()
    })
    it('should navigate to previous folder when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(previousFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should tolerate missing previous folder when showUnreadOnly is not set', async () => {
      Navigation.current.prev = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should navigate to previous unread folder when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(previousUnreadFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should tolerate missing previous unread folder when showUnreadOnly is set', async () => {
      Navigation.current.prevUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('PreviousFolder')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:NextFolder message Handler', () => {
    let navigateToStub = Sinon.stub()
    let showUnreadOnlyStub = Sinon.stub()
    let nextFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let nextUnreadFolder = {
      name: 'FOO',
      path: '/FOO',
      cover: '/FOO/bar.jpg',
    }
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      showUnreadOnlyStub = Sinon.stub(Pictures, 'GetShowUnreadOnly').returns(false)
      Navigation.Init()
      nextFolder = {
        name: `Foo ${Math.random()}`,
        path: `/Foo ${Math.random()}`,
        cover: `/Foo ${Math.random()}/bar.jpg`,
      }
      nextUnreadFolder = {
        name: `Bar ${Math.random()}`,
        path: `/Bar ${Math.random()}`,
        cover: `/Bar ${Math.random()}/baz.jpg`,
      }
      Navigation.current.next = nextFolder
      Navigation.current.nextUnread = nextUnreadFolder
      const h = PubSub.subscribers['ACTION:EXECUTE:NEXTFOLDER']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
      showUnreadOnlyStub.restore()
    })
    it('should navigate to next folder when showUnreadOnly is not set', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(nextFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should tolerate missing next folder when showUnreadOnly is not set', async () => {
      Navigation.current.next = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should navigate to next unread folder when showUnreadOnly is set', async () => {
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(nextUnreadFolder.path)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should tolerate missing next unread folder when showUnreadOnly is set', async () => {
      Navigation.current.nextUnread = undefined
      showUnreadOnlyStub.returns(true)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('NextFolder')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:ParentFolder message Handler', () => {
    let navigateToStub = Sinon.stub()
    let parentFolder = ''
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      Navigation.Init()
      parentFolder = `/Foo ${Math.random()}`
      Navigation.current.parent = parentFolder
      const h = PubSub.subscribers['ACTION:EXECUTE:PARENTFOLDER']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
    })
    it('should navigate to parent folder', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(parentFolder)
      expect(navigateToStub.firstCall.args[1]).to.equal('ParentFolder')
    })
    it('should tolerate invalidly undefined parent folder', async () => {
      Navigation.current.parent = Cast<string>(undefined)
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('ParentFolder')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:FirstUnfinished message Handler', () => {
    let navigateToStub = Sinon.stub()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    let children = [{ name: '', path: '', cover: '', totalSeen: 0, totalCount: 0 }]
    beforeEach(() => {
      navigateToStub = Sinon.stub(Navigation, 'NavigateTo')
      Navigation.Init()
      children = Array(20)
        .fill(undefined)
        .map((_, i) => ({
          name: `Foo ${i}`,
          path: `/foo${i}`,
          cover: '',
          totalSeen: i,
          totalCount: i,
        }))
      Navigation.current.children = children
      const h = PubSub.subscribers['ACTION:EXECUTE:FIRSTUNFINISHED']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      navigateToStub.restore()
    })
    it('should navigate to undefined when no children are undefined', async () => {
      Navigation.current.children = undefined
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to undefined when no child folder exist', async () => {
      Navigation.current.children = []
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to undefined when no child folder is unfinished', async () => {
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(undefined)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to unfinished child folder', async () => {
      assert(children[10] != null)
      children[10].totalCount = 100
      children[10].totalSeen = 10
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(children[10].path)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should navigate to first unfinished child folder', async () => {
      assert(children[10] != null)
      children[10].totalCount = 100
      children[10].totalSeen = 10
      assert(children[11] != null)
      children[11].totalCount = 100
      children[11].totalSeen = 10
      assert(children[19] != null)
      children[19].totalCount = 100
      children[19].totalSeen = 10
      await handler()
      expect(navigateToStub.callCount).to.equal(1)
      expect(navigateToStub.firstCall.args).to.have.lengthOf(2)
      expect(navigateToStub.firstCall.args[0]).to.equal(children[10].path)
      expect(navigateToStub.firstCall.args[1]).to.equal('FirstUnfinished')
    })
    it('should reject when NavigateTo rejects', async () => {
      const err = new Error('FOO')
      navigateToStub.rejects(err)
      expect(await EventuallyRejects(handler())).to.equal(err)
    })
  })
  describe('Action:Execute:MarkAllSeen Message Handler', () => {
    let postJSONSpy = Sinon.stub().resolves(undefined as unknown)
    let errorSpy = Sinon.stub().resolves()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      postJSONSpy = Sinon.stub(Net, 'PostJSON').resolves()
      Navigation.Init()
      loadDataStub.resetHistory()
      errorSpy = Sinon.stub().resolves()
      PubSub.subscribers['LOADING:ERROR'] = [errorSpy]
      const h = PubSub.subscribers['ACTION:EXECUTE:MARKALLSEEN']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      postJSONSpy.restore()
    })
    it('should post to mark read API endpoint', async () => {
      await handler()
      expect(postJSONSpy.firstCall.args[0]).to.equal('/api/mark/read')
    })
    it('should post expected payload to mark read API endpoint', async () => {
      const path = `/foo/bar/${Math.random()}`
      Navigation.current.path = path
      await handler()
      expect(postJSONSpy.firstCall.args[1]).to.deep.equal({ path })
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
      [
        'Listing',
        {
          name: 'foo',
          path: '/foo',
          parent: '/',
        },
      ],
    ]
    payloadTests.forEach(([name, data]) => {
      it(`should accept ${name} as result from postJSON`, async () => {
        await handler()
        const fn = Cast<(o: unknown) => boolean>(postJSONSpy.firstCall.args[2])
        expect(fn).to.be.a('function')
        expect(fn(data)).to.equal(true)
      })
    })
    it('should call LoadData after postJSON resolves', async () => {
      await handler()
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.calledAfter(postJSONSpy)).to.equal(true)
    })
    it('should call LoadData in no history mode', async () => {
      await handler()
      expect(loadDataStub.firstCall.args).to.have.lengthOf(1)
      expect(loadDataStub.firstCall.args[0]).to.equal(true)
    })
    it('should not publish LoadingError when PostJSON resolves', async () => {
      postJSONSpy.resolves()
      await handler()
      expect(errorSpy.callCount).to.equal(0)
    })
    it('should publish LoadingError when PostJSON rejects', async () => {
      postJSONSpy.rejects('FOO')
      await handler()
      expect(errorSpy.callCount).to.equal(1)
    })
    it('should publish LoadingError with exception when PostJSON rejects', async () => {
      const err = new Error('FOO')
      postJSONSpy.rejects(err)
      await handler()
      expect(errorSpy.firstCall.args[0]).to.equal(err)
    })
    it('should not call LoadData if postJSON rejects', async () => {
      postJSONSpy.rejects('FOO')
      await handler()
      expect(loadDataStub.called).to.equal(false)
    })
    it('should swallow exception when LoadData rejects', async () => {
      loadDataStub.rejects('FOO')
      await EventuallyFullfills(handler())
    })
  })
  describe('Action:Execute:MarkAllUnseen Message Handler', () => {
    let postJSONSpy = Sinon.stub().resolves(undefined as unknown)
    let errorSpy = Sinon.stub().resolves()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      postJSONSpy = Sinon.stub(Net, 'PostJSON').resolves()
      Navigation.Init()
      loadDataStub.resetHistory()
      errorSpy = Sinon.stub().resolves()
      PubSub.subscribers['LOADING:ERROR'] = [errorSpy]
      const h = PubSub.subscribers['ACTION:EXECUTE:MARKALLUNSEEN']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      postJSONSpy.restore()
    })
    it('should post to mark unread API endpoint', async () => {
      await handler()
      expect(postJSONSpy.firstCall.args[0]).to.equal('/api/mark/unread')
    })
    it('should post expected payload to mark unread API endpoint', async () => {
      const path = `/foo/bar/${Math.random()}`
      Navigation.current.path = path
      await handler()
      expect(postJSONSpy.firstCall.args[1]).to.deep.equal({ path })
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
      [
        'Listing',
        {
          name: 'foo',
          path: '/foo',
          parent: '/',
        },
      ],
    ]
    payloadTests.forEach(([name, data]) => {
      it(`should accept ${name} as result from postJSON`, async () => {
        await handler()
        const fn = Cast<(o: unknown) => boolean>(postJSONSpy.firstCall.args[2])
        expect(fn).to.be.a('function')
        expect(fn(data)).to.equal(true)
      })
    })
    it('should call LoadData after postJSON resolves', async () => {
      await handler()
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.calledAfter(postJSONSpy)).to.equal(true)
    })
    it('should call LoadData in no history mode', async () => {
      await handler()
      expect(loadDataStub.firstCall.args).to.have.lengthOf(1)
      expect(loadDataStub.firstCall.args[0]).to.equal(true)
    })
    it('should not publish LoadingError when PostJSON resolves', async () => {
      postJSONSpy.resolves()
      await handler()
      expect(errorSpy.callCount).to.equal(0)
    })
    it('should publish LoadingError when PostJSON rejects', async () => {
      postJSONSpy.rejects('FOO')
      await handler()
      expect(errorSpy.callCount).to.equal(1)
    })
    it('should publish LoadingError with exception when PostJSON rejects', async () => {
      const err = new Error('FOO')
      postJSONSpy.rejects(err)
      await handler()
      expect(errorSpy.firstCall.args[0]).to.equal(err)
    })
    it('should not call LoadData if postJSON rejects', async () => {
      postJSONSpy.rejects('FOO')
      await handler()
      expect(loadDataStub.called).to.equal(false)
    })
    it('should swallow exception when LoadData rejects', async () => {
      loadDataStub.rejects('FOO')
      await EventuallyFullfills(handler())
    })
  })
  describe('Action:Execute:Slideshow Message Handler', () => {
    let locationAssignSpy = Sinon.stub()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      Navigation.Init()
      locationAssignSpy = Sinon.stub(Navigation, 'LocationAssign')
      const h = PubSub.subscribers['ACTION:EXECUTE:SLIDESHOW']?.pop()
      assert(h != null)
      handler = h
    })
    afterEach(() => {
      locationAssignSpy.restore()
    })
    it('should alter location via locationAssign when invoked', async () => {
      await handler()
      expect(locationAssignSpy.callCount).to.equal(1)
    })
    it('should alter location to expected path when invoked', async () => {
      const path = '/foo/' + Math.random()
      Navigation.current.path = path
      await handler()
      expect(locationAssignSpy.firstCall.args[0]).to.equal('/slideshow' + path)
    })
    it('should pass expected this value when invoked', async () => {
      await handler()
      expect(locationAssignSpy.firstCall.thisValue).to.equal(dom.window.location)
    })
  })
  describe('Action:Execute:Fullscreen Message Handler', () => {
    const requestFullscreenStub = Sinon.stub()
    const exitFullscreenStub = Sinon.stub()
    const errorSpy = Sinon.stub()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      Navigation.Init()
      requestFullscreenStub.resolves()
      exitFullscreenStub.resolves()
      dom.window.document.body.requestFullscreen = requestFullscreenStub
      dom.window.document.exitFullscreen = exitFullscreenStub
      const h = PubSub.subscribers['ACTION:EXECUTE:FULLSCREEN']?.pop()
      assert(h != null)
      handler = h
      errorSpy.resolves()
      PubSub.subscribers['LOADING:ERROR'] = [errorSpy]
    })
    afterEach(() => {
      errorSpy.reset()
      requestFullscreenStub.reset()
      exitFullscreenStub.reset()
    })
    it('should execute requestFullscreen when no fullscreen element exists', async () => {
      await handler()
      expect(requestFullscreenStub.callCount).to.equal(1)
      expect(exitFullscreenStub.callCount).to.equal(0)
    })
    it('should request fullscreen without navigationUI', async () => {
      await handler()
      expect(requestFullscreenStub.firstCall.args).to.have.lengthOf(1)
      expect(requestFullscreenStub.firstCall.args[0]).to.deep.equal({ navigationUI: 'hide' })
    })
    it('should not publish Loading:Error when requestFullscreen resolves', async () => {
      requestFullscreenStub.resolves()
      await handler()
      expect(errorSpy.called).to.equal(false)
    })
    it('should publish Loading:Error when requestFullscreen rejects', async () => {
      requestFullscreenStub.rejects('FOO')
      await handler()
      expect(errorSpy.called).to.equal(true)
    })
    it('should pass exception to Loading:Error when requestFullscreen rejects', async () => {
      const err = new Error('FOO')
      requestFullscreenStub.rejects(err)
      await handler()
      expect(errorSpy.firstCall.args[0]).to.equal(err)
    })
    it('should exit fullscreen when full screen element exists', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      await handler()
      expect(requestFullscreenStub.callCount).to.equal(0)
      expect(exitFullscreenStub.callCount).to.equal(1)
    })
    it('should not publish Loading:Error when exitFullscreen resolves', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      exitFullscreenStub.resolves()
      await handler()
      expect(errorSpy.called).to.equal(false)
    })
    it('should publish Loading:Error when exitFullscreen rejects', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      exitFullscreenStub.rejects('FOO')
      await handler()
      expect(errorSpy.called).to.equal(true)
    })
    it('should pass exception to Loading:Error when exitFullscreen rejects', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      const err = new Error('FOO')
      exitFullscreenStub.rejects(err)
      await handler()
      expect(errorSpy.firstCall.args[0]).to.equal(err)
    })
  })
  describe('Message Forwarding Message Handlers', () => {
    beforeEach(() => {
      Navigation.Init()
    })
    const mappers: Array<[string, string]> = [
      ['Action:Execute:ShowMenu', 'Menu:Show'],
      ['Action:Execute:HideMenu', 'Menu:Hide'],
      ['Action:Keypress:<Ctrl>ArrowUp', 'Action:Execute:ParentFolder'],
      ['Action:Keypress:<Ctrl>ArrowDown', 'Action:Execute:FirstUnfinished'],
      ['Action:Keypress:<Ctrl>ArrowLeft', 'Action:Execute:PreviousFolder'],
      ['Action:Keypress:<Ctrl>ArrowRight', 'Action:Execute:NextFolder'],
      ['Action:Gamepad:Down', 'Action:Execute:PreviousFolder'],
      ['Action:Gamepad:Up', 'Action:Execute:NextFolder'],
      ['Action:Gamepad:Y', 'Action:Execute:ParentFolder'],
      ['Action:Gamepad:A', 'Action:Execute:FirstUnfinished'],
    ]
    mappers.forEach(([from, to]) => {
      it(`should map event ${from} to ${to}`, async () => {
        const spy = Sinon.stub().resolves()
        PubSub.subscribers[to.toUpperCase()] = [spy]
        const handler = PubSub.subscribers[from.toUpperCase()]?.pop()
        assert(handler != null)
        await handler(undefined)
        expect(spy.callCount).to.equal(1)
      })
    })
  })
})
