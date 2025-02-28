'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { Tabs } from '../../../public/scripts/app/tabs'
import { assert } from 'console'
import { Cast } from '../../testutils/TypeGuards'

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

const TestTabs = {
  getTabs: () => Tabs.tabs,
  getTabNames: () => Tabs.tabNames,
  Reset: (): void => {
    Tabs.tabs = []
    Tabs.tabNames = []
  },
}

@suite
export class AppTabsTests {
  consoleError: sinon.SinonStub
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  actionsScroll: sinon.SinonStub
  foldersScroll: sinon.SinonStub
  imagesScroll: sinon.SinonStub
  bookmarksScroll: sinon.SinonStub
  tabSelectedSpy: sinon.SinonStub
  constructor() {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('', {})
    this.consoleError = sinon.stub()
    this.actionsScroll = sinon.stub()
    this.foldersScroll = sinon.stub()
    this.imagesScroll = sinon.stub()
    this.bookmarksScroll = sinon.stub()
    this.tabSelectedSpy = sinon.stub()
  }

  before(): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.existingWindow = global.window
    global.window = Cast<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    global.document = this.dom.window.document
    this.consoleError = sinon.stub(global.window.console, 'error')
    const actions = this.dom.window.document.getElementById('tabActions')
    if (actions != null) {
      actions.scroll = this.actionsScroll
    }
    const folders = this.dom.window.document.getElementById('tabFolders')
    if (folders != null) {
      folders.scroll = this.foldersScroll
    }
    const images = this.dom.window.document.getElementById('tabImages')
    if (images != null) {
      images.scroll = this.imagesScroll
    }
    const bookmarks = this.dom.window.document.getElementById('tabBookmarks')
    if (bookmarks != null) {
      bookmarks.scroll = this.bookmarksScroll
    }
    PubSub.subscribers = {}
    PubSub.deferred = []
    PubSub.Subscribe('Tab:Selected', this.tabSelectedSpy)
    TestTabs.Reset()
    Tabs.Init()
    this.tabSelectedSpy.reset()
    this.actionsScroll.reset()
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }

  @test
  'Init(): All tabs discovered'(): void {
    TestTabs.Reset()
    expect(TestTabs.getTabs()).to.have.length(0)
    expect(TestTabs.getTabNames()).to.have.length(0)
    Tabs.Init()
    expect(TestTabs.getTabs()).to.have.length(4)
    expect(TestTabs.getTabNames()).to.have.length(4)
  }

  @test
  'Init(): Subscribes to Tab:Select event'(): void {
    expect(PubSub.subscribers['TAB:SELECT']).to.have.length(1)
  }

  @test
  'Init(): Tab:Select fires SelectTab'(): void {
    const spy = sinon.stub(Tabs, 'SelectTab')
    try {
      spy.returns(undefined)
      PubSub.Publish('Tab:Select', 'FOOBAR')
      expect(spy.calledWith('FOOBAR')).to.equal(true)
    } finally {
      spy.restore()
    }
  }

  @test
  'Init(): Registers click events for tabs which fire SelectTab'(): void {
    const spy = sinon.stub(Tabs, 'SelectTab')
    try {
      spy.returns(undefined)
      for (const link of this.dom.window.document.querySelectorAll('.tab-list a')) {
        const event = new this.dom.window.MouseEvent('click')
        link.parentElement?.dispatchEvent(event)
        const href = link.getAttribute('href') ?? undefined
        assert(href !== undefined, 'href must be defined')
        expect(spy.calledWith(href)).to.equal(true)
      }
    } finally {
      spy.restore()
    }
  }

  @test
  'Init(): Click event handler defaults to empty string on null href'(): void {
    const spy = sinon.stub(Tabs, 'SelectTab')
    try {
      spy.returns(undefined)
      const link = this.dom.window.document.querySelector<HTMLElement>('a[href="#tabActions"]')
      link?.removeAttribute('href')
      const event = new this.dom.window.MouseEvent('click')
      link?.parentElement?.dispatchEvent(event)
      expect(link?.getAttribute('href')).to.equal(null)
      expect(spy.calledWith('')).to.equal(true)
    } finally {
      spy.restore()
    }
  }

  @test
  'SelectTab() publishes selectedTab'(): void {
    Tabs.SelectTab('#tabImages')
    expect(this.tabSelectedSpy.calledWith('#tabImages')).to.equal(true)
  }

  @test
  'SelectTab() adds missing `#tab` prefix to href'(): void {
    Tabs.SelectTab('Images')
    expect(this.tabSelectedSpy.calledWith('#tabImages')).to.equal(true)
  }

  @test
  'SelectTab() is case insensitive'(): void {
    Tabs.SelectTab('#TABIMAGES')
    expect(this.tabSelectedSpy.calledWith('#tabImages')).to.equal(true)
  }

  @test
  'SelectTab() defaults to first tab when selecting non existant tab'(): void {
    Tabs.SelectTab('#TABDOESNOTEXIST')
    expect(this.tabSelectedSpy.calledWith(TestTabs.getTabNames()[0])).to.equal(true)
  }

  @test
  'SelectTab() sets active css class on selected Tab'(): void {
    Tabs.SelectTab(TestTabs.getTabNames()[2])
    expect(TestTabs.getTabs()[2]?.parentElement?.classList.contains('active')).to.equal(true)
  }

  @test
  'SelectTab() removes active css class on non selected tab'(): void {
    TestTabs.getTabs()[2]?.parentElement?.classList.add('active')
    Tabs.SelectTab(TestTabs.getTabNames()[1])
    expect(TestTabs.getTabs()[2]?.parentElement?.classList.contains('active')).to.equal(false)
  }

  @test
  'SelectTab() removes active css class null href tab'(): void {
    TestTabs.getTabs()[2]?.parentElement?.classList.add('active')
    TestTabs.getTabs()[2]?.removeAttribute('href')
    Tabs.SelectTab(TestTabs.getTabNames()[2])
    expect(TestTabs.getTabs()[2]?.parentElement?.classList.contains('active')).to.equal(false)
  }

  @test
  'SelectTab() displays contected content on tab select'(): void {
    Tabs.SelectTab(TestTabs.getTabNames()[1])
    expect(
      this.dom.window.document
        .querySelector<HTMLElement>(TestTabs.getTabs()[1]?.getAttribute('href') ?? '')
        ?.style.getPropertyValue('display'),
    ).to.equal('block')
  }

  @test
  'SelectTab() scrolls contnet into view on tab select'(): void {
    Tabs.SelectTab('Folders')
    expect(
      this.foldersScroll.calledWith({
        top: 0,
        behavior: 'smooth',
      }),
    ).to.equal(true)
  }

  @test
  'SelectTab Handles no tabs gracefully'(): void {
    TestTabs.Reset()
    Tabs.SelectTab('Images')
    expect(true, 'Should not have thrown on previous line').to.equal(true)

    Tabs.SelectTab()
    expect(true, 'Should not have thrown on previous line').to.equal(true)
  }

  @test
  'SelectTab() hides other tab content on tab select'(): void {
    const content = this.dom.window.document.querySelector<HTMLElement>(
      TestTabs.getTabs()[1]?.getAttribute('href') ?? '',
    )
    content?.style.setProperty('display', 'block')
    Tabs.SelectTab(TestTabs.getTabNames()[3])
    expect(content?.style.getPropertyValue('display')).to.equal('none')
  }
}
