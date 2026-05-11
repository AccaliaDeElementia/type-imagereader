'use sanity'

import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import type { Listing } from '#contracts/listing.js'

import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Imports, init, Internals } from '#public/scripts/app/bookmarks.js'

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

describe('public/app/bookmarks init Bookmarks:Load', () => {
  let dom: JSDOM = new JSDOM('', {})

  let BuildBookmarksSpy = sandbox.stub()
  let getJSONSpy = sandbox.stub()
  let publishStub = sandbox.stub()
  let subscribeStub = sandbox.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    subscribeStub = sandbox.stub(Imports, 'subscribe')

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    BuildBookmarksSpy = sandbox.stub(Internals, 'buildBookmarks')
    getJSONSpy = sandbox.stub(Imports, 'getJSON').resolves()
    init()
    publishStub = sandbox.stub(Imports, 'publish')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should use Net.getJSON to load bookmarks', async () => {
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(getJSONSpy.callCount).toBe(1)
  })
  it('should request expected API endpoint to load bookmarks', async () => {
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(getJSONSpy.firstCall.args[0]).toBe('/api/bookmarks')
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
      const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
      await fn(undefined)
      const acceptor = getJSONSpy.firstCall.args[1] as unknown
      assert(acceptor !== undefined)
      const result = cast<(o: unknown) => boolean>(acceptor)
      expect(result(obj)).toBe(expected)
    })
  })
  it('should call BuildBookmarks once when getJSON resolves', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.resolves(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(BuildBookmarksSpy.callCount).toBe(1)
  })
  it('should pass empty name to BuildBookmarks when getJSON resolves', async () => {
    getJSONSpy.resolves([])
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).name).toBe('')
  })
  it('should pass empty path to BuildBookmarks when getJSON resolves', async () => {
    getJSONSpy.resolves([])
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).path).toBe('')
  })
  it('should pass resolved data as bookmarks to BuildBookmarks', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.resolves(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).bookmarks).toBe(data)
  })
  it('should not publish Loading:Error when getJSON resolves', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.resolves(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(publishStub.callCount).toBe(0)
  })
  it('should not build bookmarks when getJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.rejects(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(BuildBookmarksSpy.callCount).toBe(0)
  })
  it('should publish Loading:Error when getJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.rejects(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(publishStub.calledWith('Loading:Error')).toBe(true)
  })
  it('should publish received error to Loading:Error when getJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.rejects(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(publishStub.firstCall.args[1]).toBe(data)
  })

  const runStaleResponseScenario = async (): Promise<{ secondData: unknown }> => {
    const { promise: firstPromise, resolve: resolveFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    const secondData = [{ name: 'second', path: '/second', bookmarks: [] }]
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
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
    expect(BuildBookmarksSpy.callCount).toBe(1)
  })
  it('should pass the newer response to buildBookmarks when a stale response arrives later', async () => {
    const { secondData } = await runStaleResponseScenario()
    expect(cast<Listing>(BuildBookmarksSpy.firstCall.args[0]).bookmarks).toBe(secondData)
  })
  it('should not publish Loading:Error for a stale rejection', async () => {
    const { promise: firstPromise, reject: rejectFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    getJSONSpy.onFirstCall().returns(firstPromise).onSecondCall().returns(secondPromise)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    const a = fn(undefined)
    const b = fn(undefined)
    resolveSecond([{ name: 'second', path: '/second', bookmarks: [] }])
    await b
    rejectFirst(new Error('stale'))
    await a
    expect(publishStub.callCount).toBe(0)
  })
})
