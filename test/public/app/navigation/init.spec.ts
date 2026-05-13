'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { cast } from '#testutils/typeGuards.js'

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
  let loadDataStub = sandbox.stub()
  let subscribeStub = sandbox.stub()
  let forwardStub = sandbox.stub()
  const allRegisteredTopics = (): string[] => [
    ...subscribeStub.getCalls().map((c) => cast<string>(c.args[0])),
    ...forwardStub.getCalls().map((c) => cast<string>(c.args[0])),
  ]
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    loadDataStub = sandbox.stub(Internals, 'loadData').resolves()
    subscribeStub = sandbox.stub(Imports, 'subscribe')
    forwardStub = sandbox.stub(Imports, 'forward')
    Navigation.current = {
      path: '/',
      name: '',
      parent: '',
    }
  })
  afterEach(() => {
    sandbox.restore()
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
    expect(Navigation.current.path).toBe('/foo/bar/baz')
  })
  it('should execute loadData once with defaults', () => {
    init()
    expect(loadDataStub.callCount).toBe(1)
  })
  it('should execute loadData with no arguments', () => {
    init()
    expect(loadDataStub.firstCall.args).toEqual([])
  })
  it('should tolerate loadData rejecting', async () => {
    loadDataStub.rejects('FOO!')
    init()
    await Promise.resolve()
    expect(loadDataStub.callCount).toBe(1)
  })
  const subscribers = [
    'Navigate:Data',
    'Navigate:Load',
    'Navigate:Reload',
    'Menu:show',
    'Menu:Hide',
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
    'Action:Gamepad:North',
    'Action:Gamepad:East',
  ]
  describe('subscriber list after init', () => {
    const subs = subscribers.map((s) => s.toUpperCase())
    beforeEach(() => {
      init()
    })
    it('should contain all expected subscribers', () => {
      expect(
        allRegisteredTopics()
          .map((s) => s.toUpperCase())
          .sort(),
      ).toEqual([...subs].sort())
    })
    it('should contain no unexpected subscribers', () => {
      expect(allRegisteredTopics()).toHaveLength(subs.length)
    })
  })
  subscribers.forEach((subscriber) => {
    const doInit = (): void => {
      init()
    }
    it(`should subscribe to ${subscriber}`, () => {
      doInit()
      expect(allRegisteredTopics().map((s) => s.toUpperCase())).toContain(subscriber.toUpperCase())
    })
    it(`should subscribe to ${subscriber} exactly once`, () => {
      doInit()
      const matches = allRegisteredTopics().filter((t) => t.toUpperCase() === subscriber.toUpperCase())
      expect(matches).toHaveLength(1)
    })
  })
})
