'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../testutils/TypeGuards'
import { Pictures } from '../../../../../public/scripts/app/pictures'
import { EventuallyRejects } from '../../../../testutils/Errors'

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
describe('public/app/navigation nessage handler Action:Execute:PreviousFolder', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
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
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
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
