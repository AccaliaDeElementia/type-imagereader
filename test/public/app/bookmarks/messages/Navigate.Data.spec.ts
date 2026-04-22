'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '#testutils/TypeGuards'

import { PubSub } from '#public/scripts/app/pubsub'
import { resetPubSub } from '#testutils/PubSub'
import { Bookmarks } from '#public/scripts/app/bookmarks'

import assert from 'node:assert'

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

describe('public/app/bookmarks Init Navigate:Data', () => {
  let existingWindow: Window & typeof globalThis = global.window
  let existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})

  let BuildBookmarksSpy = sandbox.stub()

  beforeEach(() => {
    existingWindow = global.window
    existingDocument = global.document
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    resetPubSub()

    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null

    BuildBookmarksSpy = sandbox.stub(Bookmarks, 'buildBookmarks')

    Bookmarks.Init()
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
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
      const fn = PubSub.subscribers['NAVIGATE:DATA']?.pop()
      assert(fn !== undefined)
      await fn(data)
      expect(BuildBookmarksSpy.called).to.equal(expected)
    })
  })
})
