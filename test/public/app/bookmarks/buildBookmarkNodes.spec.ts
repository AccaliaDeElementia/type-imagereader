'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'

import { resetPubSub } from '#testutils/PubSub.js'
import { Bookmarks, Internals } from '#public/scripts/app/bookmarks.js'
import Sinon from 'sinon'

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

describe('public/app/bookmarks function buildBookmarkNodes()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let getFolderSpy = sandbox.stub()
  let buildBookmarkSpy = sandbox.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    getFolderSpy = sandbox.stub(Internals, 'GetOrCreateFolderElement').returns(dom.window.document.createElement('div'))
    buildBookmarkSpy = sandbox.stub(Internals, 'BuildBookmark').returns(dom.window.document.createElement('div'))

    resetPubSub()

    Bookmarks.BookmarkFolders = []
  })
  afterEach(() => {
    sandbox.restore()
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
    expect(getFolderSpy.called).to.equal(false)
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
    expect(getFolderSpy.called).to.equal(false)
  })
  it('should call GetOrCreateFolderElement once', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.callCount).to.equal(1)
  })
  it('should call GetOrCreateFolderElement with 2 arguments', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.firstCall.args).to.have.lengthOf(2)
  })
  it('should pass parent path as first argument to GetOrCreateFolderElement', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.firstCall.args[0]).to.equal('/FOO/BAR!')
  })
  it('should pass bookmark folder as second argument to GetOrCreateFolderElement', () => {
    const folder = { name: 'Quux', path: '/path/to/Quux', bookmarks: [] }
    Internals.buildBookmarkNodes({ name: '', path: '', parent: '', bookmarks: [folder] }, '/FOO/BAR!')
    expect(getFolderSpy.firstCall.args[1]).to.equal(folder)
  })
  it('should not build bookmarks when folder retrieve fails', () => {
    getFolderSpy.returns(null)
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
    expect(buildBookmarkSpy.callCount).to.equal(0)
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
    expect(buildBookmarkSpy.callCount).to.equal(0)
  })
  it('should call BuildBookmark once per bookmark', () => {
    const mark = { name: 'FOO', path: 'BAR', folder: 'BAZ' }
    Internals.buildBookmarkNodes(
      { name: '', path: '', parent: '', bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [mark] }] },
      '',
    )
    expect(buildBookmarkSpy.callCount).to.equal(1)
  })
  it('should call BuildBookmark with 1 argument', () => {
    const mark = { name: 'FOO', path: 'BAR', folder: 'BAZ' }
    Internals.buildBookmarkNodes(
      { name: '', path: '', parent: '', bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [mark] }] },
      '',
    )
    expect(buildBookmarkSpy.firstCall.args).to.have.lengthOf(1)
  })
  it('should pass the bookmark to BuildBookmark', () => {
    const mark = { name: 'FOO', path: 'BAR', folder: 'BAZ' }
    Internals.buildBookmarkNodes(
      { name: '', path: '', parent: '', bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [mark] }] },
      '',
    )
    expect(buildBookmarkSpy.firstCall.args[0]).to.equal(mark)
  })
  it('should increase folder child count by 1 when appending bookmark card', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i += 1) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.returns(folder)
    buildBookmarkSpy.returns(dom.window.document.createElement('div'))
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [{ name: 'FOO', path: 'BAR', folder: 'BAZ' }] }],
      },
      '',
    )
    expect(folder.children).to.have.lengthOf(11)
  })
  it('should append the bookmark card as the last child of the folder node', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i += 1) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.returns(folder)
    const card = dom.window.document.createElement('div')
    buildBookmarkSpy.returns(card)
    Internals.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [{ name: 'Quux', path: '/path/to/Quux', bookmarks: [{ name: 'FOO', path: 'BAR', folder: 'BAZ' }] }],
      },
      '',
    )
    expect(folder.children[10]).to.equal(card)
  })
  it('should not append node to folder node when bookmark card creation fails', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i += 1) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.returns(folder)
    buildBookmarkSpy.returns(null)
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
    expect(folder.children).to.have.lengthOf(10)
  })
})
