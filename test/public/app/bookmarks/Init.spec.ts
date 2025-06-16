'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'
import type { Listing } from '../../../../contracts/listing'

import { Net } from '../../../../public/scripts/app/net'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Bookmarks } from '../../../../public/scripts/app/bookmarks'

import assert from 'assert'

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

describe('public/app/bookmarks function Init()', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let document: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    document = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    document = dom.window.document
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should locate bookmarkCard template on init', () => {
    const content = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    expect(content).to.not.equal(undefined)
    Bookmarks.Init()
    expect(Bookmarks.bookmarkCard).to.equal(content)
  })
  it('should locate bookmarkFolder template on init', () => {
    const content = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    expect(content).to.not.equal(undefined)
    Bookmarks.Init()
    expect(Bookmarks.bookmarkFolder).to.equal(content)
  })
  it('should locate bookmarksTab template on init', () => {
    const content = document.querySelector<HTMLElement>('#tabBookmarks')
    expect(content).to.not.equal(undefined)
    Bookmarks.Init()
    expect(Bookmarks.bookmarksTab).to.equal(content)
  })
  it('should subscribe to Navigate:Data', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:DATA')
  })
  it('should subscribe to Bookmarks:Load', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:LOAD')
  })
  it('should subscribe to Bookmarks:Add', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:ADD')
  })
  it('should subscribe to Bookmarks:Remove', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:REMOVE')
  })
})
describe('public/app/bookmarks Init Navigate:Data', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  let BuildBookmarksSpy = Sinon.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    BuildBookmarksSpy = Sinon.stub(Bookmarks, 'buildBookmarks')

    Bookmarks.Init()
  })
  afterEach(() => {
    BuildBookmarksSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  const testCases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['number', 72, false],
    ['string', 'foo!', false],
    ['invalid listingnull', { name: 'FOO' }, false],
    ['valid listing', { name: '', path: '', parent: '' }, true],
  ]
  testCases.forEach(([title, data, expected]) => {
    it(`should${expected ? '' : ' not'} build bookmarks when Navigate:Load loads ${title}`, async () => {
      const fn = PubSub.subscribers['NAVIGATE:DATA']?.pop()
      assert(fn !== undefined)
      await fn(data)
      expect(BuildBookmarksSpy.called).to.equal(expected)
    })
  })
})
describe('public/app/bookmarks Init Bookmarks:Load', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  let BuildBookmarksSpy = Sinon.stub()
  let getJSONSpy = Sinon.stub()
  let loadingErrorSpy = Sinon.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    loadingErrorSpy = Sinon.stub().resolves()
    PubSub.subscribers = {
      'LOADING:ERROR': [loadingErrorSpy],
    }
    PubSub.deferred = []

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    BuildBookmarksSpy = Sinon.stub(Bookmarks, 'buildBookmarks')
    getJSONSpy = Sinon.stub(Net, 'GetJSON').resolves()
    Bookmarks.Init()
  })
  afterEach(() => {
    getJSONSpy.restore()
    BuildBookmarksSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
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
  it('should build bookmarks when GetJSON resolves', async () => {
    const data = [{ BOOKMARK_DATA: Math.random() }]
    getJSONSpy.resolves(data)
    const fn = PubSub.subscribers['BOOKMARKS:LOAD']?.pop()
    assert(fn !== undefined)
    await fn(undefined)
    expect(BuildBookmarksSpy.callCount).to.equal(1)
    const marks = Cast<Listing>(BuildBookmarksSpy.firstCall.args[0])
    expect(marks.name).to.equal('')
    expect(marks.path).to.equal('')
    expect(marks.bookmarks).to.equal(data)
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
})
describe('public/app/bookmarks Init Bookmarks:Add', () => {
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

    postJSONSpy = Sinon.stub(Net, 'PostJSON').resolves()
    Bookmarks.Init()
  })
  afterEach(() => {
    postJSONSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
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
  it('should publish Bookmarks:Load on rejection for no data', async () => {
    postJSONSpy.rejects(new Error('Empty JSON response recieved'))
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(true)
  })
  it('should publish Loading:Success on rejection for no data', async () => {
    postJSONSpy.rejects(new Error('Empty JSON response recieved'))
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on rejection for no data', async () => {
    postJSONSpy.rejects(new Error('Empty JSON response recieved'))
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
  it('should publish generic Loading:Error with error on rejection with non error', async () => {
    postJSONSpy.rejects({})
    const fn = PubSub.subscribers['BOOKMARKS:ADD']?.pop()
    assert(fn !== undefined)
    await fn('foo!')
    expect(loadingErrorSpy.firstCall.args[0]).to.be.an.instanceOf(Error)
    const err = Cast<Error>(loadingErrorSpy.firstCall.args[0])
    expect(err.message).to.equal('Non Error rejection!')
  })
})

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

    postJSONSpy = Sinon.stub(Net, 'PostJSON').resolves()
    Bookmarks.Init()
  })
  afterEach(() => {
    postJSONSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
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
