'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { Imports, init, Internals, Tabs } from '#public/scripts/app/tabs.js'
import assert from 'node:assert'
import { hasValue } from '#utils/helpers.js'

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

describe('public/app/tabs init()', () => {
  let dom = new JSDOM('<html></html>', {})
  let selectTabSpy = sandbox.stub()
  let subscribeStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'https://127.1.1.1:5050/',
    })
    mountDom(dom)
    selectTabSpy = sandbox.stub(Internals, 'selectTab')
    subscribeStub = sandbox.stub(Imports, 'subscribe')
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
    expect(Tabs.tabs).toHaveLength(0)
    init()
    expect(Tabs.tabs).toHaveLength(links.length)
  })
  it('should discover expected tab name count', () => {
    expect(Tabs.tabNames).toHaveLength(0)
    init()
    expect(Tabs.tabNames).toHaveLength(links.length)
  })
  it('should subscribe to Tab:Select event', () => {
    init()
    expect(subscribeStub.calledWith('Tab:Select')).toBe(true)
  })
  it('should call selectTab once for Tab:Select event', async () => {
    init()
    selectTabSpy.resetHistory()
    const fn = capturedSubscriber(subscribeStub, 'Tab:Select')
    await fn('FOOBAR')
    expect(selectTabSpy.callCount).toBe(1)
  })
  it('should select provided tab for Tab:Select event', async () => {
    init()
    selectTabSpy.resetHistory()
    const fn = capturedSubscriber(subscribeStub, 'Tab:Select')
    await fn('FOOBAR')
    expect(selectTabSpy.firstCall.args).toEqual(['FOOBAR'])
  })
  it('should ignore non string value for Tab:Select event', async () => {
    init()
    selectTabSpy.resetHistory()
    const fn = capturedSubscriber(subscribeStub, 'Tab:Select')
    await fn(null)
    expect(selectTabSpy.callCount).toBe(0)
  })
  links.forEach((link, idx) => {
    it(`should find a[href="${link}"] as tab selector`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      init()
      expect(Tabs.tabs[idx]).toBe(elem)
    })
    it(`should find ${link} as tab name`, () => {
      init()
      expect(Tabs.tabNames[idx]).toBe(link)
    })
    it(`should call addEventListener once on tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)?.parentElement
      assert(hasValue(elem))
      const spy = sandbox.stub(elem, 'addEventListener')
      try {
        init()
        expect(spy.callCount).toBe(1)
      } finally {
        spy.restore()
      }
    })
    it(`should add click handler with two args to tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)?.parentElement
      assert(hasValue(elem))
      const spy = sandbox.stub(elem, 'addEventListener')
      try {
        init()
        expect(spy.firstCall.args).toHaveLength(2)
      } finally {
        spy.restore()
      }
    })
    it(`should add click handler to tab parent element for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)?.parentElement
      assert(hasValue(elem))
      const spy = sandbox.stub(elem, 'addEventListener')
      try {
        init()
        expect(spy.firstCall.args[0]).toBe('click')
      } finally {
        spy.restore()
      }
    })
    it(`should trigger selectTab on tab click for ${link}`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.callCount).toBe(1)
    })
    it(`should select expected tab for ${link} click handler`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.firstCall.args).toEqual([link])
    })
    it(`should select default for ${link} with removed href`, () => {
      const elem = dom.window.document.querySelector(`a[href="${link}"]`)
      elem?.removeAttribute('href')
      init()
      selectTabSpy.resetHistory()
      const evt = new dom.window.MouseEvent('click')
      elem?.parentElement?.dispatchEvent(evt)
      expect(selectTabSpy.firstCall.args).toEqual([''])
    })
  })
})
