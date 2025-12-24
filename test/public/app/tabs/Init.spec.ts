'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'
import { Tabs } from '../../../../public/scripts/app/tabs'
import assert from 'node:assert'

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

describe('public/app/tabs function Init()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let selectTabSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'https://127.1.1.1:5050/',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    selectTabSpy = Sinon.stub(Tabs, 'SelectTab')
    PubSub.subscribers = {}
    Tabs.tabs = []
    Tabs.tabNames = []
  })
  afterEach(() => {
    selectTabSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  const links = ['#tabActions', '#tabFolders', '#tabImages', '#tabBookmarks']
  it('should discover expected tab count', () => {
    expect(Tabs.tabs).to.have.length(0)
    Tabs.Init()
    expect(Tabs.tabs).to.have.length(links.length)
  })
  it('should discover expected tab name count', () => {
    expect(Tabs.tabNames).to.have.length(0)
    Tabs.Init()
    expect(Tabs.tabNames).to.have.length(links.length)
  })
  it('should subscribe to Tab:Select event', () => {
    Tabs.Init()
    expect(PubSub.subscribers).to.have.any.keys('TAB:SELECT')
  })
  it('should select provided tab for Tab:Select event', async () => {
    Tabs.Init()
    selectTabSpy.resetHistory()
    const fn = PubSub.subscribers['TAB:SELECT']?.[0]
    assert(fn != null)
    await fn('FOOBAR')
    expect(selectTabSpy.callCount).to.equal(1)
    expect(selectTabSpy.firstCall.args).to.deep.equal(['FOOBAR'])
  })
  it('should ignore non string value for Tab:Select event', async () => {
    Tabs.Init()
    selectTabSpy.resetHistory()
    const fn = PubSub.subscribers['TAB:SELECT']?.[0]
    assert(fn != null)
    await fn(null)
    expect(selectTabSpy.callCount).to.equal(0)
  })
  links.forEach((link, idx) => {
    it(`should find a[href="${link}"] as tab selector`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      expect(elem).to.not.equal(null)
      Tabs.Init()
      expect(Tabs.tabs[idx]).to.equal(elem)
    })
    it(`should find ${link} as tab name`, () => {
      Tabs.Init()
      expect(Tabs.tabNames[idx]).to.equal(link)
    })
    it(`should add click handler to tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)?.parentElement
      assert(elem != null)
      const spy = Sinon.stub(elem, 'addEventListener')
      try {
        Tabs.Init()
        expect(spy.callCount).to.equal(1)
        expect(spy.firstCall.args).to.have.lengthOf(2)
        expect(spy.firstCall.args[0]).to.equal('click')
      } finally {
        spy.restore()
      }
    })
    it(`should add click handler to tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      expect(elem).to.not.equal(null)
      Tabs.Init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.callCount).to.equal(1)
    })
    it(`should select expected tab for ${link} click handler`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      expect(elem).to.not.equal(null)
      Tabs.Init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.firstCall.args).to.deep.equal([link])
    })
    it(`should select default for ${link} with removed href`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      expect(elem).to.not.equal(null)
      elem?.removeAttribute('href')
      Tabs.Init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.firstCall.args).to.deep.equal([''])
    })
  })
})
