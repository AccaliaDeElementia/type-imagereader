'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, init } from '#public/scripts/app/bookmarks.js'

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

describe('public/app/bookmarks init()', () => {
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
    init()
    expect(Bookmarks.bookmarkCard).toBe(content)
  })
  it('should locate bookmarkFolder template on init', () => {
    const content = document.querySelector<HTMLTemplateElement>('#BookmarkFolder')?.content
    init()
    expect(Bookmarks.bookmarkFolder).toBe(content)
  })
  it('should locate bookmarksTab template on init', () => {
    const content = document.querySelector<HTMLElement>('#tabBookmarks')
    init()
    expect(Bookmarks.bookmarksTab).toBe(content)
  })
  it('should subscribe to Navigate:Data', () => {
    init()
    expect(Object.keys(PubSub.subscribers)).toContain('NAVIGATE:DATA')
  })
  it('should subscribe to Bookmarks:Load', () => {
    init()
    expect(Object.keys(PubSub.subscribers)).toContain('BOOKMARKS:LOAD')
  })
  it('should subscribe to Bookmarks:Add', () => {
    init()
    expect(Object.keys(PubSub.subscribers)).toContain('BOOKMARKS:ADD')
  })
  it('should subscribe to Bookmarks:Remove', () => {
    init()
    expect(Object.keys(PubSub.subscribers)).toContain('BOOKMARKS:REMOVE')
  })
})
