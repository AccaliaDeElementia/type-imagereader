'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../testutils/TypeGuards'

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
describe('public/app/navigation message handler Action:Execute:Fullscreen', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
  const requestFullscreenStub = Sinon.stub()
  const exitFullscreenStub = Sinon.stub()
  const errorSpy = Sinon.stub()
  let handler = async (_?: unknown, __?: string): Promise<void> => {
    await Promise.resolve()
  }
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
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
  })
  it('should execute requestFullscreen when no fullscreen element exists', async () => {
    Object.defineProperty(dom.window.document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
    await handler()
    expect(requestFullscreenStub.callCount).to.equal(1)
    expect(exitFullscreenStub.callCount).to.equal(0)
  })
  it('should request fullscreen without navigationUI', async () => {
    Object.defineProperty(dom.window.document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
    await handler()
    expect(requestFullscreenStub.firstCall.args).to.have.lengthOf(1)
    expect(requestFullscreenStub.firstCall.args[0]).to.deep.equal({ navigationUI: 'hide' })
  })
  it('should not publish Loading:Error when requestFullscreen resolves', async () => {
    Object.defineProperty(dom.window.document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
    requestFullscreenStub.resolves()
    await handler()
    expect(errorSpy.called).to.equal(false)
  })
  it('should publish Loading:Error when requestFullscreen rejects', async () => {
    Object.defineProperty(dom.window.document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
    requestFullscreenStub.rejects('FOO')
    await handler()
    expect(errorSpy.called).to.equal(true)
  })
  it('should pass exception to Loading:Error when requestFullscreen rejects', async () => {
    Object.defineProperty(dom.window.document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
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
