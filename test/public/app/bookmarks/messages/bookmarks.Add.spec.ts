'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'

import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Imports, init } from '#public/scripts/app/bookmarks.js'

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

describe('public/app/bookmarks init Bookmarks:Add', () => {
  let dom: JSDOM = new JSDOM('', {})

  let postJSONSpy: MockInstance = vi.fn()
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

    postJSONSpy = vi.spyOn(Imports, 'postJSON').mockResolvedValue(undefined)
    init()
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  const postDataCases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['string', 'FOO!', true],
    ['number', -2.871, false],
    ['boolean false', false, false],
    ['boolean true', true, false],
    ['object', {}, false],
    ['array', [], false],
  ]
  postDataCases.forEach(([title, data, expected]) => {
    it(`should${expected ? '' : ' not'} post ${title} data`, async () => {
      const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
      await fn(data)
      expect(postJSONSpy.mock.calls.length > 0).toBe(expected)
    })
    it(`should accept ${title} data from network`, async () => {
      const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
      await fn('FOO!')
      const acceptor = postJSONSpy.mock.calls[0]?.[2] as unknown
      assert(acceptor !== undefined)
      const result = cast<(o: unknown) => boolean>(acceptor)(data)
      expect(result).toBe(true)
    })
  })
  it('should post to expected URL', async () => {
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('FOO!')
    expect(postJSONSpy.mock.calls[0]?.[0]).toBe('/api/bookmarks/add')
  })
  it('should post expected data object', async () => {
    const path = `THIS IS MY PATH${Math.random()}`
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn(path)
    expect(postJSONSpy.mock.calls[0]?.[1]).toEqual({ path })
  })
  it('should publish Bookmarks:Load on success with data', async () => {
    postJSONSpy.mockResolvedValue({ foo: 'BAR!' })
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Bookmarks:Load')).toBe(true)
  })
  it('should publish Loading:Success on success with data', async () => {
    postJSONSpy.mockResolvedValue({ foo: 'BAR!' })
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Success')).toBe(true)
  })
  it('should not publish Loading:Error on success with data', async () => {
    postJSONSpy.mockResolvedValue({ foo: 'BAR!' })
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(false)
  })
  it('should publish Bookmarks:Load on empty response', async () => {
    postJSONSpy.mockResolvedValue(null)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Bookmarks:Load')).toBe(true)
  })
  it('should publish Loading:Success on empty response', async () => {
    postJSONSpy.mockResolvedValue(null)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Success')).toBe(true)
  })
  it('should not publish Loading:Error on empty response', async () => {
    postJSONSpy.mockResolvedValue(null)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(false)
  })
  it('should not publish Bookmarks:Load on rejection', async () => {
    postJSONSpy.mockRejectedValue(new Error('FOO!'))
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Bookmarks:Load')).toBe(false)
  })
  it('should not publish Loading:Success on rejection', async () => {
    postJSONSpy.mockRejectedValue(new Error('FOO!'))
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Success')).toBe(false)
  })
  it('should publish Loading:Error on rejection', async () => {
    postJSONSpy.mockRejectedValue(new Error('FOO!'))
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(true)
  })
  it('should publish Loading:Error with error on rejection', async () => {
    const err = new Error('FOO!')
    postJSONSpy.mockRejectedValue(err)
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls[0]?.[1]).toBe(err)
  })
  it('should publish a generic Error on rejection with non-error', async () => {
    postJSONSpy.mockRejectedValue({})
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(publishStub.mock.calls[0]?.[1]).toBeInstanceOf(Error)
  })
  it('should set message on generic error on rejection with non-error', async () => {
    postJSONSpy.mockRejectedValue({})
    const fn = capturedSubscriber(subscribeStub, 'Bookmarks:Add')
    await fn('foo!')
    expect(cast<Error>(publishStub.mock.calls[0]?.[1]).message).toBe('Non Error rejection!')
  })
})
