'use sanity'

import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'

import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { Bookmarks, Imports, init, Internals } from '#public/scripts/app/bookmarks.js'

const sandbox = Sinon.createSandbox()

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

describe('public/app/bookmarks init Navigate:Data', () => {
  let dom: JSDOM = new JSDOM('', {})

  let BuildBookmarksSpy = sandbox.stub()
  let subscribeStub = sandbox.stub()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)

    resetPubSub()
    subscribeStub = sandbox.stub(Imports, 'subscribe')

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    BuildBookmarksSpy = sandbox.stub(Internals, 'buildBookmarks')

    init()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  const testCases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['number', 72, false],
    ['string', 'foo!', false],
    ['invalid listingnull', { name: 'FOO' }, false],
    ['valid listing', { name: '', path: '', parent: '' }, true],
  ]
  testCases.forEach(([title, data, expected]) => {
    it(`should${expected ? '' : ' not'} build bookmarks when Navigate:Load loads ${title}`, async () => {
      const fn = capturedSubscriber(subscribeStub, 'Navigate:Data')
      await fn(data)
      expect(BuildBookmarksSpy.called).toBe(expected)
    })
  })
})
