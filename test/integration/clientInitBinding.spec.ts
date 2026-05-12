'use sanity'

import { JSDOM } from 'jsdom'
import { renderFile } from 'pug'
import Sinon from 'sinon'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { resetPubSub } from '#testutils/pubsub.js'

import { Folders, init as foldersInit } from '#public/scripts/app/folders.js'
import { Bookmarks, init as bookmarksInit } from '#public/scripts/app/bookmarks.js'
import { Confirm, init as confirmInit } from '#public/scripts/app/confirm.js'
import { Loading, init as loadingInit } from '#public/scripts/app/loading.js'
import { Pictures, Imports as PicturesImports } from '#public/scripts/app/pictureState.js'
import { Grid } from '#public/scripts/app/pictureMarkup.js'

// Match the private constant inside bookmarks.ts; if that source value ever changes,
// this baseline reset will need to follow.
const INITIAL_LOAD_TOKEN = 0

describe('app.pug ↔ client init binding', () => {
  beforeAll(() => {
    const html = renderFile('views/app.pug', { asset: (p: string) => p })
    const dom = new JSDOM(html, { url: 'http://127.0.0.1:2999/' })
    mountDom(dom)
  })

  afterAll(() => {
    // Reset every state singleton this spec touches back to declared baselines,
    // so test files that run later see the same module state as they would on
    // a fresh import. PubSub subscribers and the DOM globals also get cleared.
    Folders.folderCard = null
    Bookmarks.bookmarkCard = undefined
    Bookmarks.bookmarkFolder = undefined
    Bookmarks.bookmarksTab = null
    Bookmarks.bookmarkFolders = []
    Bookmarks.loadToken = INITIAL_LOAD_TOKEN
    Confirm.dialogElement = null
    Confirm.titleElement = null
    Confirm.messageElement = null
    Confirm.resolve = undefined
    Loading.overlay = null
    Loading.navbar = null
    Pictures.mainImage = null
    Grid.imageCard = null
    resetPubSub()
    unmountDom()
  })

  beforeEach(() => {
    resetPubSub()
  })

  describe('folders init', () => {
    beforeEach(() => {
      Folders.folderCard = null
      foldersInit()
    })
    it('populates Folders.folderCard from #FolderCard template', () => {
      expect(Folders.folderCard).not.toBe(null)
    })
  })

  describe('bookmarks init', () => {
    beforeEach(() => {
      Bookmarks.bookmarkCard = undefined
      Bookmarks.bookmarkFolder = undefined
      Bookmarks.bookmarksTab = null
      bookmarksInit()
    })
    it('populates Bookmarks.bookmarkCard from #BookmarkCard template', () => {
      expect(Bookmarks.bookmarkCard).not.toBe(undefined)
    })
    it('populates Bookmarks.bookmarkFolder from #BookmarkFolder template', () => {
      expect(Bookmarks.bookmarkFolder).not.toBe(undefined)
    })
    it('populates Bookmarks.bookmarksTab from #tabBookmarks element', () => {
      expect(Bookmarks.bookmarksTab).not.toBe(null)
    })
  })

  describe('confirm init', () => {
    beforeEach(() => {
      Confirm.dialogElement = null
      Confirm.titleElement = null
      Confirm.messageElement = null
      confirmInit()
    })
    it('populates Confirm.dialogElement from #confirmDialog', () => {
      expect(Confirm.dialogElement).not.toBe(null)
    })
    it('populates Confirm.titleElement from #confirmDialog .title', () => {
      expect(Confirm.titleElement).not.toBe(null)
    })
    it('populates Confirm.messageElement from #confirmDialog .message', () => {
      expect(Confirm.messageElement).not.toBe(null)
    })
  })

  describe('loading init', () => {
    beforeEach(() => {
      Loading.overlay = null
      Loading.navbar = null
      loadingInit()
    })
    it('populates Loading.overlay from #loadingScreen', () => {
      expect(Loading.overlay).not.toBe(null)
    })
    it('populates Loading.navbar from #navbar', () => {
      expect(Loading.navbar).not.toBe(null)
    })
  })

  describe('pictures init', () => {
    const sandbox = Sinon.createSandbox()
    beforeEach(() => {
      // Let resetMarkup run for real so both DOM handles get populated; stub
      // the rest of the transitive chain since this spec is about wiring, not
      // what the pictureInput/unreadFilter modules do at init.
      sandbox.stub(PicturesImports, 'initActions')
      sandbox.stub(PicturesImports, 'initMouse')
      sandbox.stub(PicturesImports, 'initUnreadSelectorSlider')
      Pictures.mainImage = null
      Grid.imageCard = null
      Pictures.init()
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('populates Pictures.mainImage from #bigImage img', () => {
      expect(Pictures.mainImage).not.toBe(null)
    })
    it('populates Grid.imageCard from #ImageCard template', () => {
      expect(Grid.imageCard).not.toBe(null)
    })
  })
})
