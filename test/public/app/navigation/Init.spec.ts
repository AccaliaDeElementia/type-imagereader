'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'

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
})
