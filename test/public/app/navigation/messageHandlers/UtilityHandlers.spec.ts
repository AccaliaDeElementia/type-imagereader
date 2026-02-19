'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../testutils/TypeGuards'
import { Net } from '../../../../../public/scripts/app/net'
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
      assert(h !== undefined)
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
      assert(h !== undefined)
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
      assert(h !== undefined)
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
      const path = `/foo/${Math.random()}`
      Navigation.current.path = path
      await handler()
      expect(locationAssignSpy.firstCall.args[0]).to.equal(`/slideshow${path}`)
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
      assert(h !== undefined)
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
        assert(handler !== undefined)
        await handler(undefined)
        expect(spy.callCount).to.equal(1)
      })
    })
  })
})
