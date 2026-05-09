'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { getSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Imports, init } from '#public/scripts/app/bookmarks.js'

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

describe('public/app/bookmarks init Bookmarks:Add', () => {
  let dom: JSDOM = new JSDOM('', {})

  let postJSONSpy = sandbox.stub()
  let bookmarksLoadSpy = sandbox.stub()
  let loadingErrorSpy = sandbox.stub()
  let loadingSuccessSpy = sandbox.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

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

    postJSONSpy = sandbox.stub(Imports, 'postJSON').resolves()
    init()
  })
  afterEach(() => {
    sandbox.restore()
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
      const fn = getSubscriber('BOOKMARKS:ADD')
      await fn(data)
      expect(postJSONSpy.called).to.equal(expected)
    })
    it(`should accept ${title} data from network`, async () => {
      const fn = getSubscriber('BOOKMARKS:ADD')
      await fn('FOO!')
      const acceptor = postJSONSpy.firstCall.args[2] as unknown
      assert(acceptor !== undefined)
      const result = cast<(o: unknown) => boolean>(acceptor)(data)
      expect(result).to.equal(true)
    })
  })
  it('should post to expected URL', async () => {
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('FOO!')
    expect(postJSONSpy.firstCall.args[0]).to.equal('/api/bookmarks/add')
  })
  it('should post expected data object', async () => {
    const path = `THIS IS MY PATH${Math.random()}`
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn(path)
    expect(postJSONSpy.firstCall.args[1]).to.deep.equal({ path })
  })
  it('should publish Bookmarks:Load on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(true)
  })
  it('should publish Loading:Success on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on success with data', async () => {
    postJSONSpy.resolves({ foo: 'BAR!' })
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should publish Bookmarks:Load on empty response', async () => {
    postJSONSpy.resolves(null)
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(true)
  })
  it('should publish Loading:Success on empty response', async () => {
    postJSONSpy.resolves(null)
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on empty response', async () => {
    postJSONSpy.resolves(null)
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should not publish Bookmarks:Load on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(bookmarksLoadSpy.called).to.equal(false)
  })
  it('should not publish Loading:Success on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingSuccessSpy.called).to.equal(false)
  })
  it('should publish Loading:Error on rejection', async () => {
    postJSONSpy.rejects(new Error('FOO!'))
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should publish Loading:Error with error on rejection', async () => {
    const err = new Error('FOO!')
    postJSONSpy.rejects(err)
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingErrorSpy.firstCall.args[0]).to.equal(err)
  })
  it('should publish a generic Error on rejection with non-error', async () => {
    postJSONSpy.rejects({})
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(loadingErrorSpy.firstCall.args[0]).to.be.an.instanceOf(Error)
  })
  it('should set message on generic error on rejection with non-error', async () => {
    postJSONSpy.rejects({})
    const fn = getSubscriber('BOOKMARKS:ADD')
    await fn('foo!')
    expect(cast<Error>(loadingErrorSpy.firstCall.args[0]).message).to.equal('Non Error rejection!')
  })
})
