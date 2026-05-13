'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Internals } from '#public/scripts/app/bookmarks.js'
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

describe('public/app/bookmarks buildBookmarkNodes()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let getFolderSpy: MockInstance = vi.fn()
  let buildBookmarkSpy: MockInstance = vi.fn()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    getFolderSpy = vi
      .spyOn(Internals, 'getOrCreateFolderElement')
      .mockReturnValue(dom.window.document.createElement('div'))
    buildBookmarkSpy = vi.spyOn(Internals, 'buildBookmark').mockReturnValue(dom.window.document.createElement('div'))

    resetPubSub()

    Bookmarks.bookmarkFolders = []
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should not retrieve folder when bookmarks are undefined', () => {
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: undefined,
      },
      '',
    )
    expect(getFolderSpy.mock.calls.length > 0).toBe(false)
  })
  it('should not retrieve folder when bookmarks are empty', () => {
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [],
      },
      '',
    )
    expect(getFolderSpy.mock.calls.length > 0).toBe(false)
  })
  it('should call getOrCreateFolderElement once', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.mock.calls.length).toBe(1)
  })
  it('should call getOrCreateFolderElement with 2 arguments', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.mock.calls[0]).toHaveLength(2)
  })
  it('should pass parent path as first argument to getOrCreateFolderElement', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.mock.calls[0]?.[0]).toBe('/FOO/BAR!')
  })
  it('should pass bookmark folder as second argument to getOrCreateFolderElement', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.mock.calls[0]?.[1]).toBe(folder)
  })
  it('should not build bookmarks when folder retrieve fails', () => {
    getFolderSpy.mockReturnValue(null)
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [
          {
            name: 'Quux',
            path: '/path/to/Quux',
            bookmarks: [{ name: 'FOO', path: 'BAR', folder: 'BAZ' }],
          },
        ],
      },
      '',
    )
    expect(buildBookmarkSpy.mock.calls.length).toBe(0)
  })
  it('should not build bookmarks when folder is empty', () => {
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [
          {
            name: 'Quux',
            path: '/path/to/Quux',
            bookmarks: [],
          },
        ],
      },
      '',
    )
    expect(buildBookmarkSpy.mock.calls.length).toBe(0)
  })
  it('should call buildBookmark once per bookmark', () => {
    const mark = { name: 'FOO', path: 'BAR', folder: 'BAZ' }
    Internals.buildBookmarkNodes(
      { name: '', path: '', parent: '', bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [mark] }] },
      '',
    )
    expect(buildBookmarkSpy.mock.calls.length).toBe(1)
  })
  it('should call buildBookmark with 1 argument', () => {
    const mark = { name: 'FOO', path: 'BAR', folder: 'BAZ' }
    Internals.buildBookmarkNodes(
      { name: '', path: '', parent: '', bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [mark] }] },
      '',
    )
    expect(buildBookmarkSpy.mock.calls[0]).toHaveLength(1)
  })
  it('should pass the bookmark to buildBookmark', () => {
    const mark = { name: 'FOO', path: 'BAR', folder: 'BAZ' }
    Internals.buildBookmarkNodes(
      { name: '', path: '', parent: '', bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [mark] }] },
      '',
    )
    expect(buildBookmarkSpy.mock.calls[0]?.[0]).toBe(mark)
  })
  it('should increase folder child count by 1 when appending bookmark card', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i += 1) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.mockReturnValue(folder)
    buildBookmarkSpy.mockReturnValue(dom.window.document.createElement('div'))
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [{ name: 'FOO', path: 'BAR', folder: 'BAZ' }] }],
      },
      '',
    )
    expect(folder.children).toHaveLength(11)
  })
  it('should append the bookmark card as the last child of the folder node', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i += 1) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.mockReturnValue(folder)
    const card = dom.window.document.createElement('div')
    buildBookmarkSpy.mockReturnValue(card)
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [{ name: 'FOO', path: 'BAR', folder: 'BAZ' }] }],
      },
      '',
    )
    expect(folder.children[10]).toBe(card)
  })
  it('should not append node to folder node when bookmark card creation fails', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i += 1) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.mockReturnValue(folder)
    buildBookmarkSpy.mockReturnValue(null)
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [
          {
            name: 'Quux',
            path: '/path/to/Quux',
            bookmarks: [{ name: 'FOO', path: 'BAR', folder: 'BAZ' }],
          },
        ],
      },
      '',
    )
    expect(folder.children).toHaveLength(10)
  })
})
