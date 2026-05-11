'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Internals } from '#public/scripts/app/bookmarks.js'
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

describe('public/app/bookmarks getOrCreateFolderElement()', () => {
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()

    Bookmarks.bookmarkFolder = dom.window.document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    Bookmarks.bookmarksTab = dom.window.document.querySelector<HTMLElement>('#tabBookmarks')
    Bookmarks.bookmarkFolders = []
  })
  afterEach(() => {
    unmountDom()
  })
  it('should return an HTMLElement', () => {
    const result = Internals.getOrCreateFolderElement('', {
      name: '',
      path: '/foo/',
      bookmarks: [],
    })
    expect(result).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should add exactly one folder to the list on creation', () => {
    expect(Bookmarks.bookmarkFolders).toHaveLength(0)
    Internals.getOrCreateFolderElement('', { name: '/foo', path: '/foo/bar.jpg', bookmarks: [] })
    expect(Bookmarks.bookmarkFolders).toHaveLength(1)
  })
  it('should store the folder path on creation', () => {
    Internals.getOrCreateFolderElement('', { name: '/foo', path: '/foo/', bookmarks: [] })
    const folder = Bookmarks.bookmarkFolders.pop()
    assert(folder !== undefined, 'Folder should exist')
    expect(folder.path).toBe('/foo/')
  })
  it('should store the folder element on creation', () => {
    const result = Internals.getOrCreateFolderElement('', { name: '/foo', path: '/foo/bar.jpg', bookmarks: [] })
    const folder = Bookmarks.bookmarkFolders.pop()
    assert(folder !== undefined, 'Folder should exist')
    expect(result).toBe(folder.element)
  })
  it('should return existing folder element for matching path', () => {
    const element = dom.window.document.createElement('div')
    Bookmarks.bookmarkFolders.push({
      path: '/foo/bar/baz/',
      element,
    })
    const result = Internals.getOrCreateFolderElement('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/',
      bookmarks: [],
    })
    expect(result).toBe(element)
  })
  it('should return null for folder when template is missing', () => {
    Bookmarks.bookmarkFolder = undefined

    const result = Internals.getOrCreateFolderElement('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/quux.png',
      bookmarks: [],
    })
    expect(result).toBe(null)
  })
  it('should set data attribute for folderPath', () => {
    const result = Internals.getOrCreateFolderElement('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/',
      bookmarks: [],
    })
    const value = result?.getAttribute('data-folderPath')
    expect(value).toBe('/foo/bar/baz/')
  })
  it('should set title', () => {
    const result = Internals.getOrCreateFolderElement('', {
      name: '/foo/bar/baz',
      path: '/foo/bar/baz/quux.png',
      bookmarks: [],
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title?.innerText).toBe('/foo/bar/baz')
  })
  it('should uridecode title', () => {
    const result = Internals.getOrCreateFolderElement('', {
      name: '%7C',
      path: '',
      bookmarks: [],
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title?.innerText).toBe('|')
  })
  it('should not create title if element is missing from template', () => {
    Bookmarks.bookmarkFolder?.querySelector('.title')?.remove()
    const result = Internals.getOrCreateFolderElement('', {
      name: '%7C',
      path: '',
      bookmarks: [],
    })
    const title = result?.querySelector<HTMLElement>('.title')
    expect(title).toBe(null)
  })
  it('should not add the closed class with matching path', () => {
    const result = Internals.getOrCreateFolderElement('/bar', {
      name: '/bar',
      path: '/bar/baz.png',
      bookmarks: [],
    })
    expect(result?.classList.contains('clsoed')).toBe(false)
  })
  it('should add the closed class with non matching path', () => {
    const result = Internals.getOrCreateFolderElement('/foo', {
      name: '/bar',
      path: '/bar/baz.png',
      bookmarks: [],
    })
    expect(result?.classList.contains('closed')).toBe(true)
  })
  it('should have on click handler to open self', () => {
    const result = Internals.getOrCreateFolderElement('/foo', {
      name: '',
      path: '/bar/baz.png',
      bookmarks: [],
    })
    const [folder] = Bookmarks.bookmarkFolders
    assert(folder !== undefined, 'must have folder to be valid test')
    const title = result?.querySelector<HTMLElement>('.title')
    assert(title !== null && title !== undefined, 'must get a result to issue event to')
    const evt = new dom.window.MouseEvent('click')
    title.dispatchEvent(evt)
    expect(folder.element.classList.contains('closed')).toBe(false)
  })
  it('should have on click handler to close others', () => {
    for (let i = 1; i <= 50; i += 1) {
      Internals.getOrCreateFolderElement('/foo', {
        name: `/bar${i}`,
        path: `/bar${i}/baz${i}.png`,
        bookmarks: [],
      })
    }
    const folder = Bookmarks.bookmarkFolders.find((_, i) => i === 25)
    assert(folder !== undefined, 'must have folder to be valid test')
    const title = folder.element.querySelector<HTMLElement>('.title')
    assert(title !== null, 'must get a result to issue event to')
    const evt = new dom.window.MouseEvent('click')
    title.dispatchEvent(evt)
    for (let i = 0; i < Bookmarks.bookmarkFolders.length; i += 1) {
      expect(Bookmarks.bookmarkFolders[i]?.element.classList.contains('closed')).toBe(i !== 25)
    }
  })
})
