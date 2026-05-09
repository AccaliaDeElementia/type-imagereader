'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { getSubscriber, resetPubSub } from '#testutils/PubSub.js'
import { Init, Internals, Tabs } from '#public/scripts/app/tabs.js'
import assert from 'node:assert'
import { HasValue } from '#utils/helpers.js'

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

describe('public/app/tabs Init()', () => {
  let dom = new JSDOM('<html></html>', {})
  let selectTabSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'https://127.1.1.1:5050/',
    })
    mountDom(dom)
    selectTabSpy = sandbox.stub(Internals, 'SelectTab')
    resetPubSub()
    Tabs.tabs = []
    Tabs.tabNames = []
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  const links = ['#tabActions', '#tabFolders', '#tabImages', '#tabBookmarks']
  it('should discover expected tab count', () => {
    expect(Tabs.tabs).to.have.length(0)
    Init()
    expect(Tabs.tabs).to.have.length(links.length)
  })
  it('should discover expected tab name count', () => {
    expect(Tabs.tabNames).to.have.length(0)
    Init()
    expect(Tabs.tabNames).to.have.length(links.length)
  })
  it('should subscribe to Tab:Select event', () => {
    Init()
    expect(PubSub.subscribers).to.have.any.keys('TAB:SELECT')
  })
  it('should call SelectTab once for Tab:Select event', async () => {
    Init()
    selectTabSpy.resetHistory()
    const fn = getSubscriber('TAB:SELECT')
    await fn('FOOBAR')
    expect(selectTabSpy.callCount).to.equal(1)
  })
  it('should select provided tab for Tab:Select event', async () => {
    Init()
    selectTabSpy.resetHistory()
    const fn = getSubscriber('TAB:SELECT')
    await fn('FOOBAR')
    expect(selectTabSpy.firstCall.args).to.deep.equal(['FOOBAR'])
  })
  it('should ignore non string value for Tab:Select event', async () => {
    Init()
    selectTabSpy.resetHistory()
    const fn = getSubscriber('TAB:SELECT')
    await fn(null)
    expect(selectTabSpy.callCount).to.equal(0)
  })
  links.forEach((link, idx) => {
    it(`should find a[href="${link}"] as tab selector`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      Init()
      expect(Tabs.tabs[idx]).to.equal(elem)
    })
    it(`should find ${link} as tab name`, () => {
      Init()
      expect(Tabs.tabNames[idx]).to.equal(link)
    })
    it(`should call addEventListener once on tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)?.parentElement
      assert(HasValue(elem))
      const spy = sandbox.stub(elem, 'addEventListener')
      try {
        Init()
        expect(spy.callCount).to.equal(1)
      } finally {
        spy.restore()
      }
    })
    it(`should add click handler with two args to tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)?.parentElement
      assert(HasValue(elem))
      const spy = sandbox.stub(elem, 'addEventListener')
      try {
        Init()
        expect(spy.firstCall.args).to.have.lengthOf(2)
      } finally {
        spy.restore()
      }
    })
    it(`should add click handler to tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)?.parentElement
      assert(HasValue(elem))
      const spy = sandbox.stub(elem, 'addEventListener')
      try {
        Init()
        expect(spy.firstCall.args[0]).to.equal('click')
      } finally {
        spy.restore()
      }
    })
    it(`should trigger SelectTab on tab click for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      Init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.callCount).to.equal(1)
    })
    it(`should select expected tab for ${link} click handler`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      Init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.firstCall.args).to.deep.equal([link])
    })
    it(`should select default for ${link} with removed href`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      elem?.removeAttribute('href')
      Init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.firstCall.args).to.deep.equal([''])
    })
  })
})
