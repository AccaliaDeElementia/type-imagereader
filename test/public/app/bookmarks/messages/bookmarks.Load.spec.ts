'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import type { Listing } from '#contracts/listing.js'

import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Imports, init, Internals } from '#public/scripts/app/bookmarks.js'

import assert from 'node:assert'
import type { MockInstance } from 'vitest'

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

  let BuildBookmarksSpy: MockInstance = vi.fn()
  let getJSONSpy: MockInstance = vi.fn()
  let publishStub: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    BuildBookmarksSpy = vi.spyOn(Internals, 'buildBookmarks').mockImplementation((..._args: unknown[]) => undefined)
    getJSONSpy = vi.spyOn(Imports, 'getJSON').mockResolvedValue(undefined)
    init()
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should use Net.getJSON to load bookmarks', async () => {
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(getJSONSpy.mock.calls.length).toBe(1)
  })
  it('should request expected API endpoint to load bookmarks', async () => {
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(getJSONSpy.mock.calls[0]?.[0]).toBe('/api/bookmarks')
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
      const acceptor = getJSONSpy.mock.calls[0]?.[1] as unknown
      assert(acceptor !== undefined)
      const result = cast<(o: unknown) => boolean>(acceptor)
      expect(result(obj)).toBe(expected)
    })
  })
  it('should call BuildBookmarks once when getJSON resolves', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.mockResolvedValue(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(BuildBookmarksSpy.mock.calls.length).toBe(1)
  })
  it('should pass empty name to BuildBookmarks when getJSON resolves', async () => {
    getJSONSpy.mockResolvedValue([])
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(cast<Listing>(BuildBookmarksSpy.mock.calls[0]?.[0]).name).toBe('')
  })
  it('should pass empty path to BuildBookmarks when getJSON resolves', async () => {
    getJSONSpy.mockResolvedValue([])
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(cast<Listing>(BuildBookmarksSpy.mock.calls[0]?.[0]).path).toBe('')
  })
  it('should pass resolved data as bookmarks to BuildBookmarks', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.mockResolvedValue(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(cast<Listing>(BuildBookmarksSpy.mock.calls[0]?.[0]).bookmarks).toBe(data)
  })
  it('should not publish Loading:Error when getJSON resolves', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.mockResolvedValue(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(publishStub.mock.calls.length).toBe(0)
  })
  it('should not build bookmarks when getJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.mockRejectedValue(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(BuildBookmarksSpy.mock.calls.length).toBe(0)
  })
  it('should publish Loading:Error when getJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.mockRejectedValue(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(true)
  })
  it('should publish received error to Loading:Error when getJSON rejects', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.mockRejectedValue(data)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    await fn(undefined)
    expect(publishStub.mock.calls[0]?.[1]).toBe(data)
  })

  const runStaleResponseScenario = async (): Promise<{ secondData: unknown }> => {
    const { promise: firstPromise, resolve: resolveFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    const secondData = [{ name: 'second', path: '/second', bookmarks: [] }]
    getJSONSpy.mockReturnValueOnce(firstPromise).mockReturnValueOnce(secondPromise)
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
    expect(BuildBookmarksSpy.mock.calls.length).toBe(1)
  })
  it('should pass the newer response to buildBookmarks when a stale response arrives later', async () => {
    const { secondData } = await runStaleResponseScenario()
    expect(cast<Listing>(BuildBookmarksSpy.mock.calls[0]?.[0]).bookmarks).toBe(secondData)
  })
  it('should not publish Loading:Error for a stale rejection', async () => {
    const { promise: firstPromise, reject: rejectFirst } = Promise.withResolvers<unknown>()
    const { promise: secondPromise, resolve: resolveSecond } = Promise.withResolvers<unknown>()
    getJSONSpy.mockReturnValueOnce(firstPromise).mockReturnValueOnce(secondPromise)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Load')
    const a = fn(undefined)
    const b = fn(undefined)
    resolveSecond([{ name: 'second', path: '/second', bookmarks: [] }])
    await b
    rejectFirst(new Error('stale'))
    await a
    expect(publishStub.mock.calls.length).toBe(0)
  })
})
