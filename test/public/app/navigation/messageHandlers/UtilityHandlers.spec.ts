'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '#public/scripts/app/pubsub'
import { Navigation } from '#public/scripts/app/navigation'
import { Cast } from '#testutils/TypeGuards'
import { resetPubSub } from '#testutils/PubSub'

const sandbox = Sinon.createSandbox()

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
  const tabSelectedSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    resetPubSub()
    tabSelectedSpy.resolves()
    PubSub.Subscribe('Tab:Selected', tabSelectedSpy)
    sandbox.stub(Navigation, 'LoadData').resolves()
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
  })
  afterEach(() => {
    sandbox.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
  })
  describe('Action:Execute:Slideshow Message Handler', () => {
    let locationAssignSpy = sandbox.stub()
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      Navigation.Init()
      locationAssignSpy = sandbox.stub(Navigation, 'LocationAssign')
      const h = PubSub.subscribers['ACTION:EXECUTE:SLIDESHOW']?.pop()
      assert(h !== undefined)
      handler = h
    })
    afterEach(() => {
      sandbox.restore()
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
    const requestFullscreenStub = sandbox.stub()
    const exitFullscreenStub = sandbox.stub()
    const errorSpy = sandbox.stub()
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
    it('should call requestFullscreen once when no fullscreen element exists', async () => {
      await handler()
      expect(requestFullscreenStub.callCount).to.equal(1)
    })
    it('should not call exitFullscreen when no fullscreen element exists', async () => {
      await handler()
      expect(exitFullscreenStub.callCount).to.equal(0)
    })
    it('should request fullscreen with one argument', async () => {
      await handler()
      expect(requestFullscreenStub.firstCall.args).to.have.lengthOf(1)
    })
    it('should request fullscreen without navigationUI', async () => {
      await handler()
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
    it('should not call requestFullscreen when fullscreen element exists', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      await handler()
      expect(requestFullscreenStub.callCount).to.equal(0)
    })
    it('should call exitFullscreen once when fullscreen element exists', async () => {
      Object.defineProperty(dom.window.document, 'fullscreenElement', {
        writable: true,
        value: dom.window.document.body,
      })
      await handler()
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
        const spy = sandbox.stub().resolves()
        PubSub.subscribers[to.toUpperCase()] = [spy]
        const handler = PubSub.subscribers[from.toUpperCase()]?.pop()
        assert(handler !== undefined)
        await handler(undefined)
        expect(spy.callCount).to.equal(1)
      })
    })
  })
})
