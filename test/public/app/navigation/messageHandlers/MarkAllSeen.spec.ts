'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { Navigation } from '#public/scripts/app/navigation.js'
import { Cast } from '#testutils/TypeGuards.js'
import { resetPubSub } from '#testutils/PubSub.js'
import { Net } from '#public/scripts/app/net.js'
import { Confirm } from '#public/scripts/app/confirm.js'
import { EventuallyFullfills } from '#testutils/Errors.js'

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
  let loadDataStub = sandbox.stub()
  beforeEach(() => {
    const dom = new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    resetPubSub()
    loadDataStub = sandbox.stub(Navigation, 'LoadData').resolves()
    Navigation.current = { path: '/', name: '', parent: '' }
  })
  afterEach(() => {
    sandbox.restore()
  })
  afterAll(() => {
    global.window = existingWindow
    global.document = existingDocument
    Sinon.restore()
  })
  describe('Action:Execute:MarkAllSeen Message Handler', () => {
    let postJSONSpy = sandbox.stub().resolves(undefined as unknown)
    let errorSpy = sandbox.stub().resolves()
    let confirmShowStub = sandbox.stub().resolves(true)
    let handler = async (_?: unknown, __?: string): Promise<void> => {
      await Promise.resolve()
    }
    beforeEach(() => {
      postJSONSpy = sandbox.stub(Net, 'PostJSON').resolves()
      confirmShowStub = sandbox.stub(Confirm, 'Show').resolves(true)
      Navigation.Init()
      loadDataStub.resetHistory()
      errorSpy = sandbox.stub().resolves()
      PubSub.subscribers['LOADING:ERROR'] = [errorSpy]
      const h = PubSub.subscribers['ACTION:EXECUTE:MARKALLSEEN']?.pop()
      assert(h !== undefined)
      handler = h
    })
    afterEach(() => {
      sandbox.restore()
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
      ['Listing', { name: 'foo', path: '/foo', parent: '/' }],
    ]
    payloadTests.forEach(([name, data]) => {
      it(`should provide a function as validator for ${name} result from postJSON`, async () => {
        await handler()
        const fn = Cast<(o: unknown) => boolean>(postJSONSpy.firstCall.args[2])
        expect(fn).to.be.a('function')
      })
      it(`should accept ${name} as result from postJSON`, async () => {
        await handler()
        const fn = Cast<(o: unknown) => boolean>(postJSONSpy.firstCall.args[2])
        expect(fn(data)).to.equal(true)
      })
    })
    it('should call LoadData once after postJSON resolves', async () => {
      await handler()
      expect(loadDataStub.callCount).to.equal(1)
    })
    it('should call LoadData after (not before) postJSON resolves', async () => {
      await handler()
      expect(loadDataStub.calledAfter(postJSONSpy)).to.equal(true)
    })
    it('should call LoadData with one argument in no history mode', async () => {
      await handler()
      expect(loadDataStub.firstCall.args).to.have.lengthOf(1)
    })
    it('should call LoadData with true in no history mode', async () => {
      await handler()
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
    it('should call Confirm.Show once', async () => {
      await handler()
      expect(confirmShowStub.callCount).to.equal(1)
    })
    it('should call Confirm.Show with a non-empty string message', async () => {
      await handler()
      expect(confirmShowStub.firstCall.args[0]).to.be.a('string').with.length.greaterThan(0)
    })
    it('should not call PostJSON when Confirm.Show resolves false', async () => {
      confirmShowStub.resolves(false)
      await handler()
      expect(postJSONSpy.callCount).to.equal(0)
    })
    it('should not call LoadData when Confirm.Show resolves false', async () => {
      confirmShowStub.resolves(false)
      await handler()
      expect(loadDataStub.callCount).to.equal(0)
    })
    it('should call PostJSON when Confirm.Show resolves true', async () => {
      confirmShowStub.resolves(true)
      await handler()
      expect(postJSONSpy.callCount).to.equal(1)
    })
  })
})
