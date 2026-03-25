'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../../public/scripts/app/navigation'
import { Cast } from '../../../../../testutils/TypeGuards'
import { resetPubSub } from '../../../../../testutils/PubSub'
import type { Listing } from '../../../../../contracts/listing'

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
  const tabSelectedSpy = Sinon.stub()
  let loadDataStub = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    resetPubSub()
    tabSelectedSpy.resolves()
    PubSub.Subscribe('Tab:Selected', tabSelectedSpy)
    loadDataStub = sandbox.stub(Navigation, 'LoadData').resolves()
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
  describe('Navigate:Load Handler', () => {
    it('should set current location when passed string', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler('a string')
      expect(Navigation.current).to.deep.equal({
        path: 'a string',
        name: '',
        parent: '',
      })
    })
    it('should set current location when passed Listing', async () => {
      const data: Listing = {
        path: '/foo/bar/baz',
        name: 'Baz',
        parent: '/foo/bar',
      }
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler(data)
      expect(Navigation.current).to.equal(data)
    })
    it('should retain current location when passed invalid data', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      Navigation.current.path = '/foo/bar/bax/42'
      await handler(null)
      expect(Navigation.current.path).to.equal('/foo/bar/bax/42')
    })
    it('should not load data when passed invalid data', async () => {
      Navigation.Init()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      loadDataStub.resetHistory()
      await handler(null)
      expect(loadDataStub.callCount).to.equal(0)
    })
    it('should tolerate LoadData() rejecting', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      loadDataStub.rejects(new Event('FOO!'))
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      const catcher = (): never => expect.fail('Handler should not reject!')
      await handler('a string').catch(catcher)
    })
    it('should call LoadData() with defaults', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      const handler = PubSub.subscribers['NAVIGATE:LOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler('a string')
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.firstCall.args).to.deep.equal([])
    })
  })
  describe('Navigate:Reload Message Handler', () => {
    it('should call LoadData()', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      const handler = PubSub.subscribers['NAVIGATE:RELOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      await handler('a string')
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.firstCall.args).to.deep.equal([])
    })
    it('should tolerate LoadData() rejecting', async () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      loadDataStub.rejects(new Event('FOO!'))
      const handler = PubSub.subscribers['NAVIGATE:RELOAD']?.pop()
      assert(handler !== undefined, 'handler must have a value')
      const catcher = (): never => expect.fail('Handler should not reject!')
      await handler('a string').catch(catcher)
    })
  })
  describe('window.popstate event Handler', () => {
    it('should register popstate listener that sets current when triggered', () => {
      dom.reconfigure({
        url: 'http://type-imagereader.example.com/show/quux',
      })
      Navigation.Init()
      Navigation.current = {
        path: '/',
        name: 'WRONG NAME',
        parent: 'FOOOO',
      }
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(Navigation.current).to.deep.equal({
        path: '/quux',
        name: '',
        parent: '',
      })
    })
    it('should register popstate listener that tolerates LoadData rejecting', () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      loadDataStub.rejects(new Event('FOO!'))
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(loadDataStub.callCount).to.equal(1)
    })
    it('should register popstate listener that calls LoadData with no history flag set', () => {
      Navigation.Init()
      loadDataStub.resetHistory()
      const popStateEvent = new dom.window.PopStateEvent('popstate', {
        state: {},
      })
      dom.window.dispatchEvent(popStateEvent)
      expect(loadDataStub.callCount).to.equal(1)
      expect(loadDataStub.firstCall.args).to.deep.equal([true])
    })
  })
  describe('Navigate:Data Message Handler', () => {
    let consoleLogSpy = Sinon.stub()
    beforeEach(() => {
      consoleLogSpy = sandbox.stub(global.window.console, 'log')
    })
    afterEach(() => {
      sandbox.restore()
    })
    const testCases: Array<[string, unknown, boolean]> = [
      ['null', null, false],
      ['undefined', undefined, false],
      ['empty string', '', false],
      ['number', 3.1415926, true],
      ['boolean', false, true],
      ['string', 'Foo bar baz', true],
      ['object', { foo: 'bar' }, true],
      ['array', [1, false, 'apple'], true],
      ['listing', { path: '/foo/bar/baz', name: 'baz', parent: '/foo/bar' }, true],
    ]
    testCases.forEach(([name, data, expected]) => {
      it(`should${expected ? '' : ' not'} log data when passed ${name}`, async () => {
        Navigation.Init()
        loadDataStub.resetHistory()
        const handler = PubSub.subscribers['NAVIGATE:DATA']?.pop()
        assert(handler !== undefined, 'handler must have a value')
        await handler(data)
        expect(consoleLogSpy.called).to.equal(expected)
        if (expected) {
          expect(consoleLogSpy.firstCall.args).to.have.lengthOf(1)
          expect(consoleLogSpy.firstCall.args[0]).to.equal(data)
        }
      })
    })
  })
})
