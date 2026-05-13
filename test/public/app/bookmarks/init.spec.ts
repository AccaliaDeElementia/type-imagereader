'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Imports, init } from '#public/scripts/app/bookmarks.js'
import type { MockInstance } from 'vitest'

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
  let subscribeStub: MockInstance = vi.fn()

  beforeEach(() => {
    document = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    document = dom.window.document
    mountDom(dom)

    resetPubSub()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null
  })
  afterEach(() => {
    vi.restoreAllMocks()
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
    expect(subscribeStub).toHaveBeenCalledWith('Navigate:Data', expect.anything())
  })
  it('should subscribe to Bookmarks:Load', () => {
    init()
    expect(subscribeStub).toHaveBeenCalledWith('Bookmarks:Load', expect.anything())
  })
  it('should subscribe to Bookmarks:Add', () => {
    init()
    expect(subscribeStub).toHaveBeenCalledWith('Bookmarks:Add', expect.anything())
  })
  it('should subscribe to Bookmarks:Remove', () => {
    init()
    expect(subscribeStub).toHaveBeenCalledWith('Bookmarks:Remove', expect.anything())
  })
})
