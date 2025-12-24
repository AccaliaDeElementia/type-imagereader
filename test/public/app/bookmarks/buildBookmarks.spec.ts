'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Bookmarks } from '../../../../public/scripts/app/bookmarks'
import Sinon from 'sinon'
import assert from 'node:assert'

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

describe('public/app/bookmarks function buildBookmarks()', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let getFolderSpy = Sinon.stub()
  let buildBookmarkSpy = Sinon.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    getFolderSpy = Sinon.stub(Bookmarks, 'GetFolder').returns(dom.window.document.createElement('div'))
    buildBookmarkSpy = Sinon.stub(Bookmarks, 'BuildBookmark').returns(dom.window.document.createElement('div'))

    PubSub.subscribers = {}
    PubSub.deferred = []

    Bookmarks.BookmarkFolders = []
    Bookmarks.bookmarkCard = dom.window.document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    Bookmarks.bookmarkFolder = dom.window.document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    Bookmarks.bookmarksTab = dom.window.document.querySelector<HTMLElement>('#tabBookmarks')
  })
  afterEach(() => {
    buildBookmarkSpy.restore()
    getFolderSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should bail when bookmarksTab is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    Bookmarks.bookmarksTab = null
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.called).to.equal(false)
    expect(buildBookmarkSpy.called).to.equal(false)
  })
  it('should bail when bookmarkCard is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    Bookmarks.bookmarkCard = undefined
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.called).to.equal(false)
    expect(buildBookmarkSpy.called).to.equal(false)
  })
  it('should bail when bookmarkFolder is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.called).to.equal(false)
    expect(buildBookmarkSpy.called).to.equal(false)
  })
  it('should use the current path when no open details exist', () => {
    const data = {
      name: '',
      parent: '',
      path: '/FOO!/BAR!',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[0]).to.equal('/FOO!/BAR!')
  })
  it('should use the current path when open details with no path exists', () => {
    const data = {
      name: '',
      parent: '',
      path: '/QUUX!',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    const element = dom.window.document.createElement('div')
    element.classList.add('folder')
    Bookmarks.bookmarksTab?.appendChild(element)
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[0]).to.equal('/QUUX!')
  })
  it('should use the openPath fron open details when path exists', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    const element = dom.window.document.createElement('div')
    element.classList.add('folder')
    element.setAttribute('data-folderPath', '/foo/bar/baz')
    Bookmarks.bookmarksTab?.appendChild(element)
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[0]).to.equal('/foo/bar/baz')
  })
  it('should remove existing details from bookmark tab', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    for (let i = 1; i <= 25; i++) {
      const element = dom.window.document.createElement('div.folder')
      if (i === 12) {
        element.setAttribute('open', '')
      }
      element.setAttribute('data-folderPath', '/foo/bar/baz' + i)
      Bookmarks.bookmarksTab?.appendChild(element)
    }
    Bookmarks.buildBookmarks(data)
    expect(Bookmarks.bookmarksTab?.querySelectorAll('div.folder')).to.have.length(0)
  })
  it('should call GetFolder to retrieve folder for bookmarks', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
  })
  it('should not call BuildBookmark if GetFolder fails', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    getFolderSpy.returns(null)
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
    expect(buildBookmarkSpy.called).to.equal(false)
  })
  it('should call BuildBookmark when GetFolder succeeds', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    const folder = dom.window.document.createElement('div')
    getFolderSpy.returns(folder)
    Bookmarks.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
    expect(buildBookmarkSpy.calledWith(data.bookmarks[0]?.bookmarks[0])).to.equal(true)
  })
  it('should not appendChild when BuildBookmark fails', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    const folder = dom.window.document.createElement('details')
    getFolderSpy.returns(folder)
    const spy = Sinon.stub(folder, 'appendChild')
    buildBookmarkSpy.returns(null)
    Bookmarks.buildBookmarks(data)
    expect(spy.called).to.equal(false)
  })
  it('should appendChild when BuildBookmark succeeds', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    }
    const folder = dom.window.document.createElement('details')
    getFolderSpy.returns(folder)
    const spy = Sinon.stub(folder, 'appendChild')
    const card = dom.window.document.createElement('div')
    buildBookmarkSpy.returns(card)
    Bookmarks.buildBookmarks(data)
    expect(spy.calledWith(card)).to.equal(true)
  })
  it('should sort BookmarkFolders', () => {
    getFolderSpy.callsFake(() => {
      Bookmarks.BookmarkFolders = [
        {
          name: 'Z',
          element: dom.window.document.createElement('details'),
        },
        {
          name: 'M',
          element: dom.window.document.createElement('details'),
        },
        {
          name: 'A',
          element: dom.window.document.createElement('details'),
        },
        {
          name: 'M',
          element: dom.window.document.createElement('details'),
        },
      ]
    })
    Bookmarks.buildBookmarks({
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          path: '/',
          name: '',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    })
    expect(Bookmarks.BookmarkFolders).to.have.length(4)
    expect(Bookmarks.BookmarkFolders[0]?.name).to.equal('A')
    expect(Bookmarks.BookmarkFolders[1]?.name).to.equal('M')
    expect(Bookmarks.BookmarkFolders[2]?.name).to.equal('M')
    expect(Bookmarks.BookmarkFolders[3]?.name).to.equal('Z')
  })
  it('should add elements from BookmarkFolders', () => {
    getFolderSpy.callsFake(() => {
      Bookmarks.BookmarkFolders = []
      for (let i = 1; i <= 100; i++) {
        Bookmarks.BookmarkFolders.push({
          name: 'Z' + (101 - i),
          element: dom.window.document.createElement('details'),
        })
      }
    })
    assert(Bookmarks.bookmarksTab !== null, 'tab must exist')
    const appendChildSpy = Sinon.stub(Bookmarks.bookmarksTab, 'appendChild')
    Bookmarks.buildBookmarks({
      name: '',
      parent: '',
      path: '/',
      bookmarks: [
        {
          name: '',
          path: '/',
          bookmarks: [
            {
              name: '',
              path: '/foo/bar.png',
              folder: '/foo',
            },
          ],
        },
      ],
    })
    expect(appendChildSpy.callCount).to.equal(100)
    for (const folder of Bookmarks.BookmarkFolders) {
      expect(appendChildSpy.calledWith(folder.element)).to.equal(true)
    }
  })
})
