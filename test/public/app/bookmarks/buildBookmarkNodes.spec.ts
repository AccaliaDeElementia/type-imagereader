'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Bookmarks } from '../../../../public/scripts/app/bookmarks'
import * as sinon from 'sinon'

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
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let getFolderSpy = sinon.stub()
  let buildBookmarkSpy = sinon.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    getFolderSpy = sinon.stub(Bookmarks, 'GetFolder').returns(dom.window.document.createElement('div'))
    buildBookmarkSpy = sinon.stub(Bookmarks, 'BuildBookmark').returns(dom.window.document.createElement('div'))

    PubSub.subscribers = {}
    PubSub.deferred = []

    Bookmarks.BookmarkFolders = []
  })
  afterEach(() => {
    buildBookmarkSpy.restore()
    getFolderSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should not retrieve folder when bookmarks are undefined', () => {
    Bookmarks.buildBookmarkNodes(
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
    Bookmarks.buildBookmarkNodes(
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
  it('should call GetFolder with expected params', () => {
    const folder = {
      name: 'Quux',
      path: '/path/to/Quux',
      bookmarks: [],
    }
    Bookmarks.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [folder],
      },
      '/FOO/BAR!',
    )
    expect(getFolderSpy.callCount).to.equal(1)
    expect(getFolderSpy.firstCall.args).to.have.lengthOf(2)
    expect(getFolderSpy.firstCall.args[0]).to.equal('/FOO/BAR!')
    expect(getFolderSpy.firstCall.args[1]).to.equal(folder)
  })
  it('should not build bookmarks when folder retrieve fails', () => {
    getFolderSpy.returns(null)
    Bookmarks.buildBookmarkNodes(
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
    Bookmarks.buildBookmarkNodes(
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
  it('should build bookmarks from folder', () => {
    const mark = { name: 'FOO', path: 'BAR', folder: 'BAZ' }
    Bookmarks.buildBookmarkNodes(
      {
        name: '',
        path: '',
        parent: '',
        bookmarks: [
          {
            name: 'Quux',
            path: '/path/to/Quux',
            bookmarks: [mark],
          },
        ],
      },
      '',
    )
    expect(buildBookmarkSpy.callCount).to.equal(1)
    expect(buildBookmarkSpy.firstCall.args).to.have.lengthOf(1)
    expect(buildBookmarkSpy.firstCall.args[0]).to.equal(mark)
  })
  it('should append bookmark card to folder node', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i++) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.returns(folder)
    const card = dom.window.document.createElement('div')
    buildBookmarkSpy.returns(card)
    Bookmarks.buildBookmarkNodes(
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
    expect(folder.children).to.have.lengthOf(11)
    expect(folder.children[10]).to.equal(card)
  })
  it('should not append node to folder node when bookmark card creation fails', () => {
    const folder = dom.window.document.createElement('div')
    for (let i = 0; i < 10; i++) {
      folder.appendChild(dom.window.document.createElement('div'))
    }
    getFolderSpy.returns(folder)
    buildBookmarkSpy.returns(null)
    Bookmarks.buildBookmarkNodes(
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
