'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../testutils/TypeGuards'
import { EventuallyRejects } from '../../../../testutils/Errors'
import { Pictures } from '../../../../../public/scripts/app/pictures'

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
describe('public/app/navigation message handler Action:Execute:NextFolder', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
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
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
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
