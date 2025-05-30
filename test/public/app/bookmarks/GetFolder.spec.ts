'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

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

describe('public/app/bookmarks function GetFolder()', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

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

    Bookmarks.bookmarkFolder = dom.window.document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    Bookmarks.bookmarksTab = dom.window.document.querySelector<HTMLElement>('#tabBookmarks')
    Bookmarks.BookmarkFolders = []
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should return an HTMLElement', () => {
    const result = Bookmarks.GetFolder('', {
      name: '',
      path: '/foo/bar.jpg',
      bookmarks: [],
    })
    expect(result).to.be.an.instanceOf(dom.window.HTMLElement)
  })
  it('should add folder to folder list on creation', () => {
    expect(Bookmarks.BookmarkFolders).to.have.length(0)
    const result = Bookmarks.GetFolder('', {
      name: '/foo',
      path: '/foo/bar.jpg',
      bookmarks: [],
    })
    expect(Bookmarks.BookmarkFolders).to.have.length(1)
    const folder = Bookmarks.BookmarkFolders.pop()
    assert(folder !== undefined, 'Folder should exist')
    expect(folder.name).to.equal('/foo')
    expect(result).to.equal(folder.element)
  })
  it('should return existing folder element for matching name', () => {
    const element = dom.window.document.createElement('div')
    Bookmarks.BookmarkFolders.push({
      name: '/foo/bar/baz/',
      element,
    })
    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/',
      bookmarks: [],
    })
    expect(result).to.equal(element)
  })
  it('should return null for folder when template is missing', () => {
    Bookmarks.bookmarkFolder = undefined

    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/quux.png',
      bookmarks: [],
    })
    expect(result).to.equal(null)
  })
  it('should set data attribute for folderPath', () => {
    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/',
      bookmarks: [],
    })
    const value = result?.getAttribute('data-folderPath')
    expect(value).to.equal('/foo/bar/baz/')
  })
  it('should set title', () => {
    const result = Bookmarks.GetFolder('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/quux.png',
      bookmarks: [],
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title?.innerText).to.equal('/foo/bar/baz')
  })
  it('should uridecode title', () => {
    const result = Bookmarks.GetFolder('', {
      name: '%7C',
      path: '',
      bookmarks: [],
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title?.innerText).to.equal('|')
  })
  it('should not create title if element is missing from template', () => {
    Bookmarks.bookmarkFolder?.querySelector('.title')?.remove()
    const result = Bookmarks.GetFolder('', {
      name: '%7C',
      path: '',
      bookmarks: [],
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title).to.equal(null)
  })
  it('should not add the closed class with matching path', () => {
    const result = Bookmarks.GetFolder('/bar', {
      name: '/bar',
      path: '/bar/baz.png',
      bookmarks: [],
    })
    expect(result?.classList.contains('clsoed')).to.equal(false)
  })
  it('should add the closed class with non matching path', () => {
    const result = Bookmarks.GetFolder('/foo', {
      name: '/bar',
      path: '/bar/baz.png',
      bookmarks: [],
    })
    expect(result?.classList.contains('closed')).to.equal(true)
  })
  it('should have on click handler to open self', () => {
    const result = Bookmarks.GetFolder('/foo', {
      name: '',
      path: '/bar/baz.png',
      bookmarks: [],
    })
    const folder = Bookmarks.BookmarkFolders[0]
    assert(folder !== undefined, 'must have folder to be valid test')
    const title = result?.querySelector<HTMLElement>('.title')
    assert(title !== null && title !== undefined, 'must get a result to issue event to')
    const evt = new dom.window.MouseEvent('click')
    title.dispatchEvent(evt)
    expect(folder.element.classList.contains('closed')).to.equal(false)
  })
  it('should have on click handler to close others', () => {
    for (let i = 1; i <= 50; i++) {
      Bookmarks.GetFolder('/foo', {
        name: `/bar${i}`,
        path: `/bar${i}/baz${i}.png`,
        bookmarks: [],
      })
    }
    const folder = Bookmarks.BookmarkFolders[25]
    assert(folder !== undefined, 'must have folder to be valid test')
    const title = folder.element.querySelector<HTMLElement>('.title')
    assert(title !== null, 'must get a result to issue event to')
    const evt = new dom.window.MouseEvent('click')
    title.dispatchEvent(evt)
    for (let i = 0; i < Bookmarks.BookmarkFolders.length; i++) {
      expect(Bookmarks.BookmarkFolders[i]?.element.classList.contains('closed')).to.equal(i !== 25)
    }
  })
})
