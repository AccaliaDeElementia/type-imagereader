'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/PubSub.js'
import { Bookmarks, Init } from '#public/scripts/app/bookmarks.js'

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

describe('public/app/bookmarks function Init()', () => {
  let document: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    document = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    document = dom.window.document
    mountDom(dom)

    resetPubSub()

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null
  })
  afterEach(() => {
    unmountDom()
  })
  it('should locate bookmarkCard template on init', () => {
    const content = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    Init()
    expect(Bookmarks.bookmarkCard).to.equal(content)
  })
  it('should locate bookmarkFolder template on init', () => {
    const content = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    Init()
    expect(Bookmarks.bookmarkFolder).to.equal(content)
  })
  it('should locate bookmarksTab template on init', () => {
    const content = document.querySelector<HTMLElement>('#tabBookmarks')
    Init()
    expect(Bookmarks.bookmarksTab).to.equal(content)
  })
  it('should subscribe to Navigate:Data', () => {
    Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:DATA')
  })
  it('should subscribe to Bookmarks:Load', () => {
    Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:LOAD')
  })
  it('should subscribe to Bookmarks:Add', () => {
    Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:ADD')
  })
  it('should subscribe to Bookmarks:Remove', () => {
    Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:REMOVE')
  })
})
