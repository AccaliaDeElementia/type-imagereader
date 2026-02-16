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
describe('public/app/navigation message handler Action:Execute:FirstUnfinished', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
  let navigateToStub = Sinon.stub()
  let handler = async (_?: unknown, __?: string): Promise<void> => {
    await Promise.resolve()
  }
  let children = [{ name: '', path: '', cover: '', totalSeen: 0, totalCount: 0 }]
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
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
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
