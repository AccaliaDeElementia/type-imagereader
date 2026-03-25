'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '#testutils/TypeGuards'

import { PubSub } from '#public/scripts/app/pubsub'
import { resetPubSub } from '#testutils/PubSub'
import { Bookmarks } from '#public/scripts/app/bookmarks'

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
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let document: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    document = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    document = dom.window.document
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    resetPubSub()

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should locate bookmarkCard template on init', () => {
    const content = document.querySelector<HTMLTemplateElement>('#BookmarkCard')?.content
    Bookmarks.Init()
    expect(Bookmarks.bookmarkCard).to.equal(content)
  })
  it('should locate bookmarkFolder template on init', () => {
    const content = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    Bookmarks.Init()
    expect(Bookmarks.bookmarkFolder).to.equal(content)
  })
  it('should locate bookmarksTab template on init', () => {
    const content = document.querySelector<HTMLElement>('#tabBookmarks')
    Bookmarks.Init()
    expect(Bookmarks.bookmarksTab).to.equal(content)
  })
  it('should subscribe to Navigate:Data', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('NAVIGATE:DATA')
  })
  it('should subscribe to Bookmarks:Load', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:LOAD')
  })
  it('should subscribe to Bookmarks:Add', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:ADD')
  })
  it('should subscribe to Bookmarks:Remove', () => {
    Bookmarks.Init()
    expect(PubSub.subscribers).to.have.any.keys('BOOKMARKS:REMOVE')
  })
})
