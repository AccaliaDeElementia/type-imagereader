'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../../../testutils/TypeGuards'

import { Net } from '../../../../../public/scripts/app/net'
import { PubSub } from '../../../../../public/scripts/app/pubsub'
import { Bookmarks } from '../../../../../public/scripts/app/bookmarks'

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

describe('public/app/bookmarks Init Bookmarks:Remove', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  let postJSONSpy = Sinon.stub()
  let bookmarksLoadSpy = Sinon.stub()
  let loadingErrorSpy = Sinon.stub()
  let loadingSuccessSpy = Sinon.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    bookmarksLoadSpy = Sinon.stub().resolves()
    loadingErrorSpy = Sinon.stub().resolves()
    loadingSuccessSpy = Sinon.stub().resolves()
    PubSub.subscribers = {
      'BOOKMARKS:LOAD': [bookmarksLoadSpy],
      'LOADING:ERROR': [loadingErrorSpy],
      'LOADING:SUCCESS': [loadingSuccessSpy],
    }
    PubSub.deferred = []

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
      const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
      assert(fn !== undefined)
      await fn(data)
      expect(postJSONSpy.called).to.equal(expected)
    })
    it(`should accept ${title} data from network`, async () => {
      const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
      assert(fn !== undefined)
      await fn('FOO!')
      const acceptor = postJSONSpy.firstCall.args[2] as unknown
      assert(acceptor !== undefined)
      const result = Cast<(o: unknown) => boolean>(acceptor)(data)
      expect(result).to.equal(true)
    })
  })
  it('should post to expected URL', async () => {
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('FOO!')
    expect(postJSONSpy.firstCall.args[0]).to.equal('/api/bookmarks/remove')
  })
  it('should post expected data object', async () => {
    const path = `THIS IS MY PATH${Math.random()}`
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn(path)
    expect(postJSONSpy.firstCall.args[1]).to.deep.equal({ path })
  })
  it('should publish Bookmarks:Load on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(true)
  })
  it('should publish Loading:Success on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should publish Bookmarks:Load on rejection for no data', async () => {
    postJSONSpy.rejects(new Error('Empty JSON response recieved'))
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(true)
  })
  it('should publish Loading:Success on rejection for no data', async () => {
    postJSONSpy.rejects(new Error('Empty JSON response recieved'))
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on rejection for no data', async () => {
    postJSONSpy.rejects(new Error('Empty JSON response recieved'))
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should not publish Bookmarks:Load on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(false)
  })
  it('should not publish Loading:Success on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(false)
  })
  it('should publish Loading:Error on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should publish Loading:Error with error on rejection', async () => {
    const err = new Error('FOO!')
    postJSONSpy.rejects(err)
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.firstCall.args[0]).to.equal(err)
  })
  it('should publish generic Loading:Error with error on rejection with non error', async () => {
    postJSONSpy.rejects({})
    const fn = PubSub.subscribers['BOOKMARKS:REMOVE']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.firstCall.args[0]).to.be.an.instanceOf(Error)
    const err = Cast<Error>(loadingErrorSpy.firstCall.args[0])
    expect(err.message).to.equal('Non Error rejection!')
  })
})
