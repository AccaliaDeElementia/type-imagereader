'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { resetPubSub } from '#testutils/pubsub.js'
import { voidFn } from '#testutils/mocks.js'
import assert from 'node:assert'
import { Imports, init, Internals, Tabs } from '#public/scripts/app/tabs.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
  div
    div.tab-list
      ul
        li
          a(href="#tabActions") Actions
        li
          a(href="#tabFolders") Folders
        li.active
          a(href="#tabImages") Images
        li
          a(href="#tabBookmarks") Bookmarks
    div.tab-content
      div#tabActions
      div#tabFolders
      div#tabImages
      div#tabBookmarks
`

describe('public/app/tabs selectTab()', () => {
  let dom = new JSDOM('<html></html>', {})
  const actionsScroll = voidFn()
  const foldersScroll = voidFn()
  const imagesScroll = voidFn()
  const bookmarksScroll = voidFn()
  let publishStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {})
    mountDom(dom)
    vi.spyOn(global.window.console, 'error').mockImplementation((..._args: unknown[]) => undefined)
    const actions = dom.window.document.getElementById('tabActions')
    assert(actions !== null)
    actions.scroll = actionsScroll
    const folders = dom.window.document.getElementById('tabFolders')
    assert(folders !== null)
    folders.scroll = foldersScroll
    const images = dom.window.document.getElementById('tabImages')
    assert(images !== null)
    images.scroll = imagesScroll
    const bookmarks = dom.window.document.getElementById('tabBookmarks')
    assert(bookmarks !== null)
    bookmarks.scroll = bookmarksScroll
    resetPubSub()
    // init() registers a Tab:Select subscriber as a side effect of populating
    // Tabs.tabs/tabNames — not part of selectTab's behavior surface. Stubbed
    // here to absorb the registration; captured and asserted in init.spec.ts.
    vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    Tabs.tabs = []
    Tabs.tabNames = []
    const selectTabStub = vi.spyOn(Internals, 'selectTab').mockImplementation((..._args: unknown[]) => undefined)
    try {
      init()
    } finally {
      selectTabStub.mockRestore()
    }
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    actionsScroll.mockReset()
    foldersScroll.mockReset()
    imagesScroll.mockReset()
    bookmarksScroll.mockReset()
    unmountDom()
  })
  it('should gracefully handle zero tabs', () => {
    Tabs.tabNames = []
    Tabs.tabs = []
    expect(() => {
      Internals.selectTab()
    }).not.toThrow()
  })
  it('should accept null href', () => {
    expect(() => {
      Internals.selectTab(undefined)
    }).not.toThrow()
  })
  it('should publish once when selecting null tab', () => {
    Internals.selectTab()
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish first tab when selecting null tab', () => {
    Internals.selectTab()
    expect(publishStub.mock.calls[0]).toEqual(['Tab:Selected', '#tabActions'])
  })
  it('should publish once when selecting unknown tab', () => {
    Internals.selectTab('#tabDoesNotExist')
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish first tab when selecting unknown tab', () => {
    Internals.selectTab('#tabDoesNotExist')
    expect(publishStub.mock.calls[0]).toEqual(['Tab:Selected', '#tabActions'])
  })
  it('should publish once when selecting nonprefixed tab', () => {
    Internals.selectTab('Bookmarks')
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish selected tab when selecting nonprefixed tab', () => {
    Internals.selectTab('Bookmarks')
    expect(publishStub.mock.calls[0]).toEqual(['Tab:Selected', '#tabBookmarks'])
  })
  it('should publish once when selecting full tab', () => {
    Internals.selectTab('#tabImages')
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish selected tab when selecting full tab', () => {
    Internals.selectTab('#tabImages')
    expect(publishStub.mock.calls[0]).toEqual(['Tab:Selected', '#tabImages'])
  })
  it('should publish once even if href is removed', () => {
    const elem = dom.window.document.querySelector('a[href=tabImages]')
    elem?.removeAttribute('href')
    Internals.selectTab('#tabImages')
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish selected tab even if href is removed', () => {
    const elem = dom.window.document.querySelector('a[href=tabImages]')
    elem?.removeAttribute('href')
    Internals.selectTab('#tabImages')
    expect(publishStub.mock.calls[0]).toEqual(['Tab:Selected', '#tabImages'])
  })
  it('should publish once when selecting tab case insensitively', () => {
    Internals.selectTab('#TABFOLDERS')
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish selected tab when selecting tab case insensitively', () => {
    Internals.selectTab('#TABFOLDERS')
    expect(publishStub.mock.calls[0]).toEqual(['Tab:Selected', '#tabFolders'])
  })
  it('should add active css class to selected tab', () => {
    expect(Tabs.tabs[1]?.parentElement?.classList.contains('active')).toBe(false)
    Internals.selectTab(Tabs.tabNames[1])
    expect(Tabs.tabs[1]?.parentElement?.classList.contains('active')).toBe(true)
  })
  it('should remove active css class from unselected tab', () => {
    Tabs.tabs[2]?.parentElement?.classList.add('active')
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).toBe(true)
    Internals.selectTab(Tabs.tabNames[1])
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).toBe(false)
  })
  it('should remove active css class from null hrwf tab', () => {
    Tabs.tabs[2]?.parentElement?.classList.add('active')
    Tabs.tabs[2]?.removeAttribute('href')
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).toBe(true)
    Internals.selectTab(Tabs.tabNames[2])
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).toBe(false)
  })
  it('should display connected content on tab select', () => {
    const elem = dom.window.document.getElementById('tabImages')
    assert(elem !== null)
    elem.style.display = 'none'
    Internals.selectTab('Images')
    expect(elem.style.getPropertyValue('display')).toBe('block')
  })
  it('should hide other content on tab select', () => {
    const elem = dom.window.document.getElementById('tabFolders')
    assert(elem !== null)
    elem.style.display = 'block'
    Internals.selectTab('Images')
    expect(elem.style.getPropertyValue('display')).toBe('none')
  })
  it('should scroll to top of content on tab select', () => {
    expect(imagesScroll.mock.calls.length).toBe(0)
    Internals.selectTab('Images')
    expect(imagesScroll.mock.calls.length).toBe(1)
  })
  it('should scroll with expected options on tab select', () => {
    Internals.selectTab('Images')
    expect(imagesScroll.mock.calls[0]).toEqual([{ top: 0, behavior: 'smooth' }])
  })
})
