'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'

import { resetPubSub } from '#testutils/PubSub.js'
import { Bookmarks, Internals } from '#public/scripts/app/bookmarks.js'
import Sinon from 'sinon'
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

describe('public/app/bookmarks buildBookmarks()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let getFolderSpy = sandbox.stub()
  let buildBookmarkSpy = sandbox.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    getFolderSpy = sandbox.stub(Internals, 'GetOrCreateFolderElement').returns(dom.window.document.createElement('div'))
    buildBookmarkSpy = sandbox
      .stub(Internals, 'BuildBookmark')
      .returns(dom.window.document.createElement('div'))
      .returns(null)

    resetPubSub()

    Bookmarks.bookmarkFolders = []
    Bookmarks.bookmarkCard = dom.window.document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    Bookmarks.bookmarkFolder = dom.window.document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    Bookmarks.bookmarksTab = dom.window.document.querySelector<HTMLElement>('#tabBookmarks')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should not call GetOrCreateFolderElement when bookmarksTab is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    Bookmarks.bookmarksTab = null
    Internals.buildBookmarks(data)
    expect(getFolderSpy.called).to.equal(false)
  })
  it('should not call BuildBookmark when bookmarksTab is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    Bookmarks.bookmarksTab = null
    Internals.buildBookmarks(data)
    expect(buildBookmarkSpy.called).to.equal(false)
  })
  it('should not call GetOrCreateFolderElement when bookmarkCard is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    Bookmarks.bookmarkCard = undefined
    Internals.buildBookmarks(data)
    expect(getFolderSpy.called).to.equal(false)
  })
  it('should not call BuildBookmark when bookmarkCard is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    Bookmarks.bookmarkCard = undefined
    Internals.buildBookmarks(data)
    expect(buildBookmarkSpy.called).to.equal(false)
  })
  it('should not call GetOrCreateFolderElement when bookmarkFolder is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    Bookmarks.bookmarkFolder = undefined
    Internals.buildBookmarks(data)
    expect(getFolderSpy.called).to.equal(false)
  })
  it('should not call BuildBookmark when bookmarkFolder is missing', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    Bookmarks.bookmarkFolder = undefined
    Internals.buildBookmarks(data)
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
    Internals.buildBookmarks(data)
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
    Internals.buildBookmarks(data)
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
    Internals.buildBookmarks(data)
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
    for (let i = 1; i <= 25; i += 1) {
      const element = dom.window.document.createElement('div.folder')
      if (i === 12) {
        element.setAttribute('open', '')
      }
      element.setAttribute('data-folderPath', `/foo/bar/baz${i}`)
      Bookmarks.bookmarksTab?.appendChild(element)
    }
    Internals.buildBookmarks(data)
    expect(Bookmarks.bookmarksTab?.querySelectorAll('div.folder')).to.have.length(0)
  })
  it('should call GetOrCreateFolderElement to retrieve folder for bookmarks', () => {
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
    Internals.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
  })
  it('should pass bookmark folder as second arg to GetOrCreateFolderElement when GetOrCreateFolderElement fails', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    getFolderSpy.returns(null)
    Internals.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
  })
  it('should not call BuildBookmark if GetOrCreateFolderElement fails', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    getFolderSpy.returns(null)
    Internals.buildBookmarks(data)
    expect(buildBookmarkSpy.called).to.equal(false)
  })
  it('should pass bookmark folder as second arg to GetOrCreateFolderElement when GetOrCreateFolderElement succeeds', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    getFolderSpy.returns(dom.window.document.createElement('div'))
    Internals.buildBookmarks(data)
    expect(getFolderSpy.firstCall.args[1]).to.deep.equal(data.bookmarks[0])
  })
  it('should call BuildBookmark with the bookmark when GetOrCreateFolderElement succeeds', () => {
    const data = {
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    }
    getFolderSpy.returns(dom.window.document.createElement('div'))
    Internals.buildBookmarks(data)
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
    const spy = sandbox.stub(folder, 'appendChild')
    buildBookmarkSpy.returns(null)
    Internals.buildBookmarks(data)
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
    const spy = sandbox.stub(folder, 'appendChild')
    const card = dom.window.document.createElement('div')
    buildBookmarkSpy.returns(card)
    Internals.buildBookmarks(data)
    expect(spy.calledWith(Sinon.match.same(card))).to.equal(true)
  })
  const buildBookmarksWithFolders = (dom: JSDOM): void => {
    getFolderSpy.callsFake(() => {
      Bookmarks.bookmarkFolders = [
        { path: 'Z', element: dom.window.document.createElement('details') },
        { path: 'M', element: dom.window.document.createElement('details') },
        { path: 'A', element: dom.window.document.createElement('details') },
        { path: 'M', element: dom.window.document.createElement('details') },
      ]
    })
    Internals.buildBookmarks({
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ path: '/', name: '', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    })
  }
  it('should preserve all 4 bookmarkFolders after sort', () => {
    buildBookmarksWithFolders(dom)
    expect(Bookmarks.bookmarkFolders).to.have.length(4)
  })
  it('should sort bookmarkFolders: index 0 should be A', () => {
    buildBookmarksWithFolders(dom)
    expect(Bookmarks.bookmarkFolders[0]?.path).to.equal('A')
  })
  it('should sort bookmarkFolders: index 1 should be M', () => {
    buildBookmarksWithFolders(dom)
    expect(Bookmarks.bookmarkFolders[1]?.path).to.equal('M')
  })
  it('should sort bookmarkFolders: index 2 should be M', () => {
    buildBookmarksWithFolders(dom)
    expect(Bookmarks.bookmarkFolders[2]?.path).to.equal('M')
  })
  it('should sort bookmarkFolders: index 3 should be Z', () => {
    buildBookmarksWithFolders(dom)
    expect(Bookmarks.bookmarkFolders[3]?.path).to.equal('Z')
  })
  it('should call appendChild once for each BookmarkFolder', () => {
    getFolderSpy.callsFake(() => {
      Bookmarks.bookmarkFolders = []
      for (let i = 1; i <= 100; i += 1) {
        Bookmarks.bookmarkFolders.push({ path: `Z${101 - i}`, element: dom.window.document.createElement('details') })
      }
    })
    assert(Bookmarks.bookmarksTab !== null, 'tab must exist')
    const appendChildSpy = sandbox.stub(Bookmarks.bookmarksTab, 'appendChild')
    Internals.buildBookmarks({
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    })
    expect(appendChildSpy.callCount).to.equal(100)
  })
  it('should append each BookmarkFolder element to the tab', () => {
    getFolderSpy.callsFake(() => {
      Bookmarks.bookmarkFolders = []
      for (let i = 1; i <= 100; i += 1) {
        Bookmarks.bookmarkFolders.push({ path: `Z${101 - i}`, element: dom.window.document.createElement('details') })
      }
    })
    assert(Bookmarks.bookmarksTab !== null, 'tab must exist')
    const appendChildSpy = sandbox.stub(Bookmarks.bookmarksTab, 'appendChild')
    Internals.buildBookmarks({
      name: '',
      parent: '',
      path: '/',
      bookmarks: [{ name: '', path: '/', bookmarks: [{ name: '', path: '/foo/bar.png', folder: '/foo' }] }],
    })
    for (const folder of Bookmarks.bookmarkFolders) {
      expect(appendChildSpy.calledWith(Sinon.match.same(folder.element))).to.equal(true)
    }
  })
})
