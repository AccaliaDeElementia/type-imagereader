'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

import { Net } from '../../../../public/scripts/app/net'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Bookmarks } from '../../../../public/scripts/app/bookmarks'
import assert from 'node:assert'
import type { Bookmark } from '../../../../contracts/listing'

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

describe('public/app/bookmarks function BuildBookmark()', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let document: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let bookmarksRemoveSpy = Sinon.stub()
  let navigateLoadSpy = Sinon.stub()
  let postJSONSpy = Sinon.stub()

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

    navigateLoadSpy = Sinon.stub().resolves()
    bookmarksRemoveSpy = Sinon.stub().resolves()
    PubSub.subscribers = {
      'NAVIGATE:LOAD': [navigateLoadSpy],
      'BOOKMARKS:REMOVE': [bookmarksRemoveSpy],
    }
    PubSub.deferred = []

    Bookmarks.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null
    postJSONSpy = Sinon.stub(Net, 'PostJSON').resolves()
  })
  afterEach(() => {
    postJSONSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should return null if card template is missing', () => {
    Bookmarks.bookmarkCard = undefined
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar',
    })
    expect(result).to.equal(null)
  })
  it('should return HTMLElement if card template exists', () => {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar',
    })
    expect(result).to.be.instanceOf(dom.window.HTMLElement)
  })
  it('should set title in result card', () => {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar',
    })
    const elem = result?.querySelector('.title')
    expect(elem?.innerHTML).to.equal('foo')
  })
  it('should set background image to bookmark in result card', () => {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/foo/bar.png',
      folder: 'bar',
    })
    const style = result?.style.backgroundImage
    expect(style).to.equal('url("/images/preview/foo/bar.png-image.webp")')
  })
  it('should strip leading folder path from title in result card', () => {
    const result = Bookmarks.BuildBookmark({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    const elem = result?.querySelector('.title')
    expect(elem?.innerHTML).to.equal('foo')
  })
  const ClickRemoveAndWait = async (data: Bookmark): Promise<HTMLElement> => {
    const result = Bookmarks.BuildBookmark(data)
    assert(result !== null)
    let awaiter = ((): Promise<void> | null => null)()
    const evt = new dom.window.MouseEvent('click')
    Sinon.stub(evt, 'stopPropagation').callsFake(() => {
      awaiter = Promise.resolve()
    })
    const button = result.querySelector('button')
    button?.dispatchEvent(evt)
    assert(awaiter !== null)
    await awaiter
    return result
  }
  it('should publish Bookmarks:Remove on button click', async () => {
    await ClickRemoveAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(bookmarksRemoveSpy.called).to.equal(true)
  })
  it('should publish selected path to Bookmarks:Remove on button click', async () => {
    await ClickRemoveAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(bookmarksRemoveSpy.calledWith('/path/to/foo/folder/foo')).to.equal(true)
  })
  it('should stop propagation of event after handling button click', async () => {
    await ClickRemoveAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(bookmarksRemoveSpy.calledWith('/path/to/foo/folder/foo')).to.equal(true)
  })
  const ClickBookmarkAndWait = async (data: Bookmark): Promise<HTMLElement> => {
    const result = Bookmarks.BuildBookmark(data)
    assert(result !== null)
    let awaiter = ((): Promise<void> | null => null)()
    const evt = new dom.window.MouseEvent('click')
    Sinon.stub(evt, 'stopPropagation').callsFake(() => {
      awaiter = Promise.resolve()
    })
    result.dispatchEvent(evt)
    await Promise.resolve()
    assert(awaiter !== null)
    await awaiter
    return result
  }
  it('should post JSON on bookmark click', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(postJSONSpy.callCount).to.equal(1)
  })
  it('should post JSON to navigate latest on bookmark click', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(postJSONSpy.firstCall.args[0]).to.equal('/api/navigate/latest')
  })
  it('should post JSON with expected data on bookmark click', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(postJSONSpy.firstCall.args[1]).to.deep.equal({
      path: '/path/to/foo/folder/foo',
      modCount: -1,
    })
  })
  const accepterTestCases: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['string', 'FOO'],
    ['number', -999.1],
    ['boolean false', false],
    ['boolean true', true],
    ['object', {}],
    ['empty array', []],
    ['array', [1, 2, 5]],
  ]
  accepterTestCases.forEach(([title, obj]) => {
    it(`should accept ${title} as retrieved data`, async () => {
      await ClickBookmarkAndWait({
        name: '',
        path: '/path/to/foo/folder/foo',
        folder: 'bar',
      })
      const acceptor = postJSONSpy.firstCall.args[2] as unknown
      assert(acceptor !== undefined)
      const result = Cast<(o: unknown) => boolean>(acceptor)(obj)
      expect(result).to.equal(true)
    })
  })
  it('should publish Navigate:Load when PostJSON resolves', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(navigateLoadSpy.callCount).to.equal(1)
  })
  it('should publish Navigate:Load with expected payload when PostJSON resolves', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: '/path/to/foo/folder',
    })
    expect(navigateLoadSpy.firstCall.args[0]).to.deep.equal({
      path: '/path/to/foo/folder',
      noMenu: true,
    })
  })

  it('should publish Navigate:Load when PostJSON resolves', async () => {
    postJSONSpy.rejects('FOO')
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(navigateLoadSpy.callCount).to.equal(0)
  })
})
