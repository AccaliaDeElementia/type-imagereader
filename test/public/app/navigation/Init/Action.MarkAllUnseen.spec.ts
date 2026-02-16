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
describe('public/app/navigation message handler Action:Execute:MarkAllUnseen', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
  let postJSONSpy = Sinon.stub().resolves(undefined as unknown)
  let errorSpy = Sinon.stub().resolves()
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
    loadDataStub.restore()
    tabSelectedSpy.reset()
  })
  after(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
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
