'use sanity'

import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'

import { publishedData, resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Imports, Internals } from '#public/scripts/app/bookmarks.js'
import assert from 'node:assert'
import type { Bookmark } from '#contracts/listing.js'
import { isListing } from '#contracts/listing.js'

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

describe('public/app/bookmarks buildBookmark()', () => {
  let document: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let publishStub = sandbox.stub()
  let postJSONSpy = sandbox.stub()

  beforeEach(() => {
    document = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    document = dom.window.document
    mountDom(dom)

    resetPubSub()
    publishStub = sandbox.stub(Imports, 'publish')

    Bookmarks.bookmarkCard = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null
    postJSONSpy = sandbox.stub(Imports, 'postJSON').resolves()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should return null if card template is missing', () => {
    Bookmarks.bookmarkCard = undefined
    const result = Internals.buildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar',
    })
    expect(result).toBe(null)
  })
  it('should return HTMLElement if card template exists', () => {
    const result = Internals.buildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar',
    })
    expect(result).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should set title in result card', () => {
    const result = Internals.buildBookmark({
      name: '',
      path: 'foo',
      folder: 'bar',
    })
    const elem = result?.querySelector('.title')
    expect(elem?.innerHTML).toBe('foo')
  })
  it('should set background image to bookmark in result card', () => {
    const result = Internals.buildBookmark({
      name: '',
      path: '/foo/bar.png',
      folder: 'bar',
    })
    const style = result?.style.backgroundImage
    expect(style).toBe('url("/images/preview/foo/bar.png-image.webp")')
  })
  it('should strip leading folder path from title in result card', () => {
    const result = Internals.buildBookmark({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    const elem = result?.querySelector('.title')
    expect(elem?.innerHTML).toBe('foo')
  })
  const ClickRemoveAndWait = async (data: Bookmark): Promise<HTMLElement> => {
    const result = Internals.buildBookmark(data)
    assert(result !== null)
    let awaiter = ((): Promise<void> | null => null)()
    const evt = new dom.window.MouseEvent('click')
    sandbox.stub(evt, 'stopPropagation').callsFake(() => {
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
    expect(publishStub.calledWith('Bookmarks:Remove')).toBe(true)
  })
  it('should publish selected path to Bookmarks:Remove on button click', async () => {
    await ClickRemoveAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(publishStub.calledWith('Bookmarks:Remove', '/path/to/foo/folder/foo')).toBe(true)
  })
  it('should stop propagation of event after handling button click', async () => {
    const result = Internals.buildBookmark({ name: '', path: '/path/to/foo/folder/foo', folder: 'bar' })
    assert(result !== null)
    let stopPropagationCalled = false
    const evt = new dom.window.MouseEvent('click')
    sandbox.stub(evt, 'stopPropagation').callsFake(() => {
      stopPropagationCalled = true
    })
    result.querySelector('button')?.dispatchEvent(evt)
    await Promise.resolve()
    expect(stopPropagationCalled).toBe(true)
  })
  const ClickBookmarkAndWait = async (data: Bookmark): Promise<HTMLElement> => {
    const result = Internals.buildBookmark(data)
    assert(result !== null)
    let awaiter = ((): Promise<void> | null => null)()
    const evt = new dom.window.MouseEvent('click')
    sandbox.stub(evt, 'stopPropagation').callsFake(() => {
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
    expect(postJSONSpy.callCount).toBe(1)
  })
  it('should post JSON to navigate latest on bookmark click', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(postJSONSpy.firstCall.args[0]).toBe('/api/navigate/latest')
  })
  it('should post JSON with expected data on bookmark click', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(postJSONSpy.firstCall.args[1]).toEqual({
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
      const result = cast<(o: unknown) => boolean>(acceptor)(obj)
      expect(result).toBe(true)
    })
  })
  it('should publish Navigate:Load when postJSON resolves', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(publishStub.withArgs('Navigate:Load').callCount).toBe(1)
  })
  it('should publish Navigate:Load with expected payload when postJSON resolves', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: '/path/to/foo/folder',
    })
    expect(publishedData(publishStub, 'Navigate:Load')).toEqual({
      path: '/path/to/foo/folder',
      name: '',
      parent: '',
      noMenu: true,
    })
  })

  it('should publish Navigate:Load with a payload that satisfies isListing', async () => {
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: '/path/to/foo/folder',
    })
    expect(isListing(publishedData(publishStub, 'Navigate:Load'))).toBe(true)
  })
  it('should not publish Navigate:Load when postJSON rejects', async () => {
    postJSONSpy.rejects('FOO')
    await ClickBookmarkAndWait({
      name: '',
      path: '/path/to/foo/folder/foo',
      folder: 'bar',
    })
    expect(publishStub.withArgs('Navigate:Load').callCount).toBe(0)
  })
})
