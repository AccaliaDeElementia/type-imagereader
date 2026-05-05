'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '#testutils/TypeGuards.js'

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

describe('public/app/bookmarks Init Bookmarks:Add', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  let postJSONSpy = sandbox.stub()
  let bookmarksLoadSpy = sandbox.stub()
  let loadingErrorSpy = sandbox.stub()
  let loadingSuccessSpy = sandbox.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    bookmarksLoadSpy = sandbox.stub().resolves()
    loadingErrorSpy = sandbox.stub().resolves()
    loadingSuccessSpy = sandbox.stub().resolves()
    resetPubSub()
    PubSub.subscribers = {
      'BOOKMARKS:LOAD': [bookmarksLoadSpy],
      'LOADING:ERROR': [loadingErrorSpy],
      'LOADING:SUCCESS': [loadingSuccessSpy],
    }

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    postJSONSpy = sandbox.stub(Net, 'PostJSON').resolves()
    Bookmarks.Init()
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
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
      const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
      assert(fn !== undefined)
      await fn(data)
      expect(postJSONSpy.called).to.equal(expected)
    })
    it(`should accept ${title} data from network`, async () => {
      const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
      assert(fn !== undefined)
      await fn('FOO!')
      const acceptor = postJSONSpy.firstCall.args[2] as unknown
      assert(acceptor !== undefined)
      const result = Cast<(o: unknown) => boolean>(acceptor)(data)
      expect(result).to.equal(true)
    })
  })
  it('should post to expected URL', async () => {
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('FOO!')
    expect(postJSONSpy.firstCall.args[0]).to.equal('/api/bookmarks/add')
  })
  it('should post expected data object', async () => {
    const path = `THIS IS MY PATH${Math.random()}`
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn(path)
    expect(postJSONSpy.firstCall.args[1]).to.deep.equal({ path })
  })
  it('should publish Bookmarks:Load on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(true)
  })
  it('should publish Loading:Success on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should publish Bookmarks:Load on empty response', async () => {
    postJSONSpy.resolves(null)
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(true)
  })
  it('should publish Loading:Success on empty response', async () => {
    postJSONSpy.resolves(null)
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on empty response', async () => {
    postJSONSpy.resolves(null)
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should not publish Bookmarks:Load on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(false)
  })
  it('should not publish Loading:Success on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(false)
  })
  it('should publish Loading:Error on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should publish Loading:Error with error on rejection', async () => {
    const err = new Error('FOO!')
    postJSONSpy.rejects(err)
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.firstCall.args[0]).to.equal(err)
  })
  it('should publish a generic Error on rejection with non-error', async () => {
    postJSONSpy.rejects({})
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.firstCall.args[0]).to.be.an.instanceOf(Error)
  })
  it('should set message on generic error on rejection with non-error', async () => {
    postJSONSpy.rejects({})
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(Cast<Error>(loadingErrorSpy.firstCall.args[0]).message).to.equal('Non Error rejection!')
  })
})
