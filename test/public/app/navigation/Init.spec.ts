'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import { PubSub, subscribe } from '#public/scripts/app/pubsub.js'
import { init, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { resetPubSub } from '#testutils/PubSub.js'

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
describe('public/app/navigation init()', () => {
  let dom = new JSDOM('', {})
  const tabSelectedSpy = sandbox.stub()
  let loadDataStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    tabSelectedSpy.resolves()
    subscribe('Tab:Selected', tabSelectedSpy)
    loadDataStub = sandbox.stub(Internals, 'loadData').resolves()
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
  afterAll(() => {
    unmountDom()
    Sinon.restore()
  })
  it('should set path of current data on init', () => {
    dom.reconfigure({
      url: 'http://type-imagereader.example.com/show/foo/bar/baz',
    })
    init()
    expect(Navigation.current.path).to.equal('/foo/bar/baz')
  })
  it('should execute loadData once with defaults', () => {
    init()
    expect(loadDataStub.callCount).to.equal(1)
  })
  it('should execute loadData with no arguments', () => {
    init()
    expect(loadDataStub.firstCall.args).to.deep.equal([])
  })
  it('should tolerate loadData rejecting', async () => {
    loadDataStub.rejects('FOO!')
    init()
    await Promise.resolve()
    expect(loadDataStub.callCount).to.equal(1)
  })
  const subscribers = [
    'Navigate:Data',
    'Navigate:Load',
    'Navigate:Reload',
    'Menu:show',
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
  describe('subscriber list after init', () => {
    const subs = subscribers.map((s) => s.toUpperCase())
    beforeEach(() => {
      init()
    })
    it('should contain all expected subscribers', () => {
      expect(PubSub.subscribers).to.have.all.keys(subs)
    })
    it('should contain no unexpected subscribers', () => {
      expect(Object.keys(PubSub.subscribers)).to.have.lengthOf(subs.length)
    })
  })
  subscribers.forEach((subscriber) => {
    const doInit = (): void => {
      init()
    }
    it(`should subscribe to ${subscriber}`, () => {
      doInit()
      expect(PubSub.subscribers).to.have.any.keys(subscriber.toUpperCase())
    })
    it(`should subscribe to ${subscriber} exactly once`, () => {
      doInit()
      expect(PubSub.subscribers[subscriber.toUpperCase()]).to.have.lengthOf(1)
    })
  })
})
