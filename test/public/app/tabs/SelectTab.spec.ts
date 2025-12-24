'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'
import assert from 'node:assert'
import { Tabs } from '../../../../public/scripts/app/tabs'

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

describe('public/app/tabs function SelectTab()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let consoleError = Sinon.stub()
  const actionsScroll = Sinon.stub()
  const foldersScroll = Sinon.stub()
  const imagesScroll = Sinon.stub()
  const bookmarksScroll = Sinon.stub()
  const tabSelectedSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {})
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    consoleError = Sinon.stub(global.window.console, 'error')
    const actions = dom.window.document.getElementById('tabActions')
    assert(actions != null)
    actions.scroll = actionsScroll
    const folders = dom.window.document.getElementById('tabFolders')
    assert(folders != null)
    folders.scroll = foldersScroll
    const images = dom.window.document.getElementById('tabImages')
    assert(images != null)
    images.scroll = imagesScroll
    const bookmarks = dom.window.document.getElementById('tabBookmarks')
    assert(bookmarks != null)
    bookmarks.scroll = bookmarksScroll
    tabSelectedSpy.resolves()
    PubSub.subscribers = {
      'TAB:SELECTED': [tabSelectedSpy],
    }
    PubSub.deferred = []
    Tabs.tabs = []
    Tabs.tabNames = []
    const spy = Sinon.stub(Tabs, 'SelectTab')
    try {
      Tabs.Init()
    } finally {
      spy.restore()
    }
  })
  afterEach(() => {
    consoleError.restore()
    actionsScroll.reset()
    foldersScroll.reset()
    imagesScroll.reset()
    bookmarksScroll.reset()
    tabSelectedSpy.reset()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should gracefully handle zero tabs', () => {
    Tabs.tabNames = []
    Tabs.tabs = []
    expect(() => {
      Tabs.SelectTab()
    }).to.not.throw()
  })
  it('should accept null href', () => {
    expect(() => {
      Tabs.SelectTab(undefined)
    }).to.not.throw()
  })
  it('should publish first tab when selecting null tab', () => {
    Tabs.SelectTab()
    expect(tabSelectedSpy.callCount).to.equal(1)
    expect(tabSelectedSpy.firstCall.args).to.deep.equal(['#tabActions', 'TAB:SELECTED'])
  })
  it('should publish first tab when selecting unknown tab', () => {
    Tabs.SelectTab('#tabDoesNotExist')
    expect(tabSelectedSpy.callCount).to.equal(1)
    expect(tabSelectedSpy.firstCall.args).to.deep.equal(['#tabActions', 'TAB:SELECTED'])
  })
  it('should publish selected tab when selecting nonprefixed tab', () => {
    Tabs.SelectTab('Bookmarks')
    expect(tabSelectedSpy.callCount).to.equal(1)
    expect(tabSelectedSpy.firstCall.args).to.deep.equal(['#tabBookmarks', 'TAB:SELECTED'])
  })
  it('should publish selected tab when selecting full tab', () => {
    Tabs.SelectTab('#tabImages')
    expect(tabSelectedSpy.callCount).to.equal(1)
    expect(tabSelectedSpy.firstCall.args).to.deep.equal(['#tabImages', 'TAB:SELECTED'])
  })
  it('should publish selected tab even if href is removed', () => {
    const elem = dom.window.document.querySelector('a[href=tabImages]')
    elem?.removeAttribute('href')
    Tabs.SelectTab('#tabImages')
    expect(tabSelectedSpy.callCount).to.equal(1)
    expect(tabSelectedSpy.firstCall.args).to.deep.equal(['#tabImages', 'TAB:SELECTED'])
  })
  it('should publish selected tab when selecting tab case insensitively', () => {
    Tabs.SelectTab('#TABFOLDERS')
    expect(tabSelectedSpy.callCount).to.equal(1)
    expect(tabSelectedSpy.firstCall.args).to.deep.equal(['#tabFolders', 'TAB:SELECTED'])
  })
  it('should add active css class to selected tab', () => {
    expect(Tabs.tabs[1]?.parentElement?.classList.contains('active')).to.equal(false)
    Tabs.SelectTab(Tabs.tabNames[1])
    expect(Tabs.tabs[1]?.parentElement?.classList.contains('active')).to.equal(true)
  })
  it('should remove active css class from unselected tab', () => {
    Tabs.tabs[2]?.parentElement?.classList.add('active')
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).to.equal(true)
    Tabs.SelectTab(Tabs.tabNames[1])
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).to.equal(false)
  })
  it('should remove active css class from null hrwf tab', () => {
    Tabs.tabs[2]?.parentElement?.classList.add('active')
    Tabs.tabs[2]?.removeAttribute('href')
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).to.equal(true)
    Tabs.SelectTab(Tabs.tabNames[2])
    expect(Tabs.tabs[2]?.parentElement?.classList.contains('active')).to.equal(false)
  })
  it('should display connected content on tab select', () => {
    const elem = dom.window.document.getElementById('tabImages')
    assert(elem != null)
    elem.style.display = 'none'
    Tabs.SelectTab('Images')
    expect(elem.style.getPropertyValue('display')).to.equal('block')
  })
  it('should hide other content on tab select', () => {
    const elem = dom.window.document.getElementById('tabFolders')
    assert(elem != null)
    elem.style.display = 'block'
    Tabs.SelectTab('Images')
    expect(elem.style.getPropertyValue('display')).to.equal('none')
  })
  it('should scroll to top of content on tab select', () => {
    expect(imagesScroll.callCount).to.equal(0)
    Tabs.SelectTab('Images')
    expect(imagesScroll.callCount).to.equal(1)
    expect(imagesScroll.firstCall.args).to.deep.equal([{ top: 0, behavior: 'smooth' }])
  })
})
