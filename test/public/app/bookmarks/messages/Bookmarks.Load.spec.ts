'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '#testutils/TypeGuards.js'
import type { Listing } from '#contracts/listing.js'

import { Net } from '#public/scripts/app/net.js'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/PubSub.js'
import { Bookmarks } from '#public/scripts/app/bookmarks.js'

import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

const markup = `
html
  head
    title
  body
    div#mainMenu
      div#tabBookmarks
    template#BookmarkFolder 
      div.folder.closed
        div.title placeholder
    template#BookmarkCard
      div.card
        div.card-body
          h5.title placeholder
        button Remove
`

describe('public/app/bookmarks Init Bookmarks:Load', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  let BuildBookmarksSpy = sandbox.stub()
  let getJSONSpy = sandbox.stub()
  let loadingErrorSpy = sandbox.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    loadingErrorSpy = sandbox.stub().resolves()
    resetPubSub()
    PubSub.subscribers = {
      'LOADING:ERROR': [loadingErrorSpy],
    }

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    BuildBookmarksSpy = sandbox.stub(Bookmarks, 'buildBookmarks')
    getJSONSpy = sandbox.stub(Net, 'GetJSON').resolves()
    Bookmarks.Init()
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should use Net.GetJSON to load bookmarks', async () => {
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(getJSONSpy.callCount).to.equal(1)
  })
  it('should request expected API endpoint to load bookmarks', async () => {
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(getJSONSpy.firstCall.args[0]).to.equal('/api/bookmarks')
  })
  const bookmarkTestCases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['number', 3.14159, false],
    ['string', 'foo!', false],
    ['object', {}, false],
    ['empty array', [], true],
    ['invalid array', ['FOO!'], false],
    ['invalid bookmarks', [{ name: '', path: '' }], false],
    ['valid bookmarks', [{ name: '', path: '', bookmarks: [] }], true],
  ]
  bookmarkTestCases.forEach(([title, obj, expected]) => {
    it(`should${expected ? '' : ' not'} accept ${title} data`, async () => {
      const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
      assert(fn !== undefined)
      await fn(undefined)
      const acceptor = getJSONSpy.firstCall.args[1] as unknown
      assert(acceptor !== undefined)
      const result = Cast<(o: unknown) => boolean>(acceptor)
      expect(result(obj)).to.equal(expected)
    })
  })
  it('should call BuildBookmarks once when GetJSON resolves', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.resolves(data)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(BuildBookmarksSpy.callCount).to.equal(1)
  })
  it('should pass empty name to BuildBookmarks when GetJSON resolves', async () => {
    getJSONSpy.resolves([])
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(Cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).name).to.equal('')
  })
  it('should pass empty path to BuildBookmarks when GetJSON resolves', async () => {
    getJSONSpy.resolves([])
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(Cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).path).to.equal('')
  })
  it('should pass resolved data as bookmarks to BuildBookmarks', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.resolves(data)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(Cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).bookmarks).to.equal(data)
  })
  it('should not publish Loading:Error when GetJSON resolves', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.resolves(data)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
  it('should not build bookmarks when GetJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.rejects(data)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(BuildBookmarksSpy.callCount).to.equal(0)
  })
  it('should publish Loading:Error when GetJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.rejects(data)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(loadingErrorSpy.callCount).to.equal(1)
  })
  it('should publish received error to Loading:Error when GetJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.rejects(data)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(loadingErrorSpy.firstCall.args[0]).to.equal(data)
  })

  const runStaleResponseScenario = async (): Promise<{ secondData: unknown }> => {
    const { promise: firstPromise, resolve: resolveFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    const secondData = [{ name: 'second', path: '/second', bookmarks: [] }]
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    const a = fn(undefined)
    const b = fn(undefined)
    resolveSecond(secondData)
    await b
    resolveFirst([{ name: 'first', path: '/first', bookmarks: [] }])
    await a
    return { secondData }
  }

  it('should call buildBookmarks exactly once when a stale response arrives after a newer one', async () => {
    await runStaleResponseScenario()
    expect(BuildBookmarksSpy.callCount).to.equal(1)
  })
  it('should pass the newer response to buildBookmarks when a stale response arrives later', async () => {
    const { secondData } = await runStaleResponseScenario()
    expect(Cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).bookmarks).to.equal(secondData)
  })
  it('should not publish Loading:Error for a stale rejection', async () => {
    const { promise: firstPromise, reject: rejectFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    const a = fn(undefined)
    const b = fn(undefined)
    resolveSecond([{ name: 'second', path: '/second', bookmarks: [] }])
    await b
    rejectFirst(new Error('stale'))
    await a
    expect(loadingErrorSpy.callCount).to.equal(0)
  })
})
