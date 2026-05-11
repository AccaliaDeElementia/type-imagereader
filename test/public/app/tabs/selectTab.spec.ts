'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { resetPubSub } from '#testutils/pubsub.js'
import assert from 'node:assert'
import { Imports, init, Internals, Tabs } from '#public/scripts/app/tabs.js'

const sandbox = Sinon.createSandbox()

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
  const actionsScroll = sandbox.stub()
  const foldersScroll = sandbox.stub()
  const imagesScroll = sandbox.stub()
  const bookmarksScroll = sandbox.stub()
  let publishStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {})
    mountDom(dom)
    sandbox.stub(global.window.console, 'error')
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
    Tabs.tabs = []
    Tabs.tabNames = []
    const selectTabStub = sandbox.stub(Internals, 'selectTab')
    try {
      init()
    } finally {
      selectTabStub.restore()
    }
    publishStub = sandbox.stub(Imports, 'publish')
  })
  afterEach(() => {
    sandbox.restore()
    actionsScroll.reset()
    foldersScroll.reset()
    imagesScroll.reset()
    bookmarksScroll.reset()
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
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish first tab when selecting null tab', () => {
    Internals.selectTab()
    expect(publishStub.firstCall.args).toEqual(['Tab:Selected', '#tabActions'])
  })
  it('should publish once when selecting unknown tab', () => {
    Internals.selectTab('#tabDoesNotExist')
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish first tab when selecting unknown tab', () => {
    Internals.selectTab('#tabDoesNotExist')
    expect(publishStub.firstCall.args).toEqual(['Tab:Selected', '#tabActions'])
  })
  it('should publish once when selecting nonprefixed tab', () => {
    Internals.selectTab('Bookmarks')
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish selected tab when selecting nonprefixed tab', () => {
    Internals.selectTab('Bookmarks')
    expect(publishStub.firstCall.args).toEqual(['Tab:Selected', '#tabBookmarks'])
  })
  it('should publish once when selecting full tab', () => {
    Internals.selectTab('#tabImages')
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish selected tab when selecting full tab', () => {
    Internals.selectTab('#tabImages')
    expect(publishStub.firstCall.args).toEqual(['Tab:Selected', '#tabImages'])
  })
  it('should publish once even if href is removed', () => {
    const elem = dom.window.document.querySelector('a[href=tabImages]')
    elem?.removeAttribute('href')
    Internals.selectTab('#tabImages')
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish selected tab even if href is removed', () => {
    const elem = dom.window.document.querySelector('a[href=tabImages]')
    elem?.removeAttribute('href')
    Internals.selectTab('#tabImages')
    expect(publishStub.firstCall.args).toEqual(['Tab:Selected', '#tabImages'])
  })
  it('should publish once when selecting tab case insensitively', () => {
    Internals.selectTab('#TABFOLDERS')
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish selected tab when selecting tab case insensitively', () => {
    Internals.selectTab('#TABFOLDERS')
    expect(publishStub.firstCall.args).toEqual(['Tab:Selected', '#tabFolders'])
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
    expect(imagesScroll.callCount).toBe(0)
    Internals.selectTab('Images')
    expect(imagesScroll.callCount).toBe(1)
  })
  it('should scroll with expected options on tab select', () => {
    Internals.selectTab('Images')
    expect(imagesScroll.firstCall.args).toEqual([{ top: 0, behavior: 'smooth' }])
  })
})
