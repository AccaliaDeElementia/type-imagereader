'use sanity'

import { JSDOM } from 'jsdom'
import { renderFile } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { resetPubSub } from '#testutils/pubsub.js'

import { Folders, init as foldersInit } from '#public/scripts/app/folders.js'
import { Bookmarks, INITIAL_LOAD_TOKEN, init as bookmarksInit } from '#public/scripts/app/bookmarks.js'
import { Confirm, init as confirmInit } from '#public/scripts/app/confirm.js'
import { Loading, init as loadingInit } from '#public/scripts/app/loading.js'
import { Pictures, Imports as PicturesImports } from '#public/scripts/app/pictureState.js'
import { Grid } from '#public/scripts/app/pictureMarkup.js'
import { Tabs, init as tabsInit } from '#public/scripts/app/tabs.js'

describe('client template contract', () => {
  describe('app.pug', () => {
    beforeAll(() => {
      const html = renderFile('views/app.pug', { asset: (p: string) => p })
      const dom = new JSDOM(html, { url: 'http://127.0.0.1:2999/' })
      mountDom(dom)
    })

    const resetTouchedSingletonsToBaseline = (): void => {
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
      Tabs.tabs = []
      Tabs.tabNames = []
    }

    afterAll(() => {
      resetTouchedSingletonsToBaseline()
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

    const stubEverythingExceptResetMarkup = (): void => {
      vi.spyOn(PicturesImports, 'initActions')
      vi.spyOn(PicturesImports, 'initMouse')
      vi.spyOn(PicturesImports, 'initUnreadSelectorSlider')
    }

    describe('pictures init', () => {
      beforeEach(() => {
        stubEverythingExceptResetMarkup()
        Pictures.mainImage = null
        Grid.imageCard = null
        Pictures.init()
      })
      it('populates Pictures.mainImage from #bigImage img', () => {
        expect(Pictures.mainImage).not.toBe(null)
      })
      it('populates Grid.imageCard from #ImageCard template', () => {
        expect(Grid.imageCard).not.toBe(null)
      })
    })

    describe('tabs init', () => {
      beforeEach(() => {
        Tabs.tabs = []
        Tabs.tabNames = []
        tabsInit()
      })
      it('populates Tabs.tabs from .tab-list a elements', () => {
        expect(Tabs.tabs.length).toBeGreaterThan(0)
      })
      it('populates Tabs.tabNames from .tab-list a hrefs', () => {
        expect(Tabs.tabNames.length).toBeGreaterThan(0)
      })
    })

    describe('runtime selector targets', () => {
      const targets: Array<[string, string]> = [
        ['#ActionCard template (actions.ts)', '#ActionCard'],
        ['#Paginator template (pictureMarkup.ts)', '#Paginator'],
        ['#PaginatorItem template (pictureMarkup.ts)', '#PaginatorItem'],
        ['#mainMenu (navigation.ts)', '#mainMenu'],
        ['#bigImage scroll container (imageViewport.ts)', '#bigImage'],
        ['.menuButton (navigation.ts)', '.menuButton'],
        ['.selectUnreadAll (unreadFilter.ts)', '.selectUnreadAll'],
        ['.selectUnreadAll > div (unreadFilter.ts)', '.selectUnreadAll > div'],
        ['.selectScaledOriginal (sizeFilter.ts)', '.selectScaledOriginal'],
        ['.selectScaledOriginal > div (sizeFilter.ts)', '.selectScaledOriginal > div'],
        ['#confirmDialog .confirm button (confirm.ts)', '#confirmDialog .confirm'],
        ['#confirmDialog .cancel button (confirm.ts)', '#confirmDialog .cancel'],
        ['a.navbar-brand (navigation.ts)', 'a.navbar-brand'],
        ['head title (navigation.ts)', 'head title'],
        ['#tabActions injection target (actions.ts)', '#tabActions'],
        ['#tabFolders injection target (actions.ts)', '#tabFolders'],
        ['#tabImages injection target (actions.ts)', '#tabImages'],
        ['#tabBookmarks (tabs.ts)', '#tabBookmarks'],
        ['a[href="#tabImages"] (pictureNavigation.ts)', 'a[href="#tabImages"]'],
        ['.statusBar.top .left (pictureMarkup.ts)', '.statusBar.top .left'],
        ['.statusBar.top .center (pictureMarkup.ts)', '.statusBar.top .center'],
        ['.statusBar.top .right (pictureMarkup.ts)', '.statusBar.top .right'],
        ['.statusBar.bottom .left (pictureMarkup.ts)', '.statusBar.bottom .left'],
        ['.statusBar.bottom .center (pictureMarkup.ts)', '.statusBar.bottom .center'],
        ['.statusBar.bottom .right (pictureMarkup.ts)', '.statusBar.bottom .right'],
      ]
      targets.forEach(([label, selector]) => {
        it(`provides ${label}`, () => {
          expect(document.querySelector(selector)).not.toBe(null)
        })
      })
    })
  })

  describe('slideshow.pug', () => {
    beforeAll(() => {
      const html = renderFile('views/slideshow.pug', {
        asset: (p: string) => p,
        title: 'test',
        image: '/test.webp',
      })
      const dom = new JSDOM(html, { url: 'http://127.0.0.1:2999/' })
      mountDom(dom)
    })

    afterAll(() => {
      unmountDom()
    })

    describe('runtime selector targets', () => {
      const targets: Array<[string, string]> = [
        ['.time (time.ts)', '.time'],
        ['.date (time.ts)', '.date'],
        ['.weather container (weather.ts)', '.weather'],
        ['.weather .temp (weather.ts)', '.weather .temp'],
        ['.weather .desc (weather.ts)', '.weather .desc'],
        ['.weather .desc .desctext (weather.ts)', '.weather .desc .desctext'],
        ['.weather .desc .icon (weather.ts)', '.weather .desc .icon'],
        ['.localweather container (weather.ts)', '.localweather'],
        ['.localweather .temp (weather.ts)', '.localweather .temp'],
        ['.localweather .desc (weather.ts)', '.localweather .desc'],
        ['.localweather .desc .desctext (weather.ts)', '.localweather .desc .desctext'],
        ['.localweather .desc .icon (weather.ts)', '.localweather .desc .icon'],
        ['.overlay (overlay.ts)', '.overlay'],
        ['.pixel.top-left (sockets.ts)', '.pixel.top-left'],
        ['.pixel.top-right (sockets.ts)', '.pixel.top-right'],
        ['.pixel.bottom-left (sockets.ts)', '.pixel.bottom-left'],
        ['.pixel.bottom-right (sockets.ts)', '.pixel.bottom-right'],
        ['img.topImage (sockets.ts)', 'img.topImage'],
        ['img.bottomImage (sockets.ts)', 'img.bottomImage'],
        ['img.mainImage (sockets.ts)', 'img.mainImage'],
      ]
      targets.forEach(([label, selector]) => {
        it(`provides ${label}`, () => {
          expect(document.querySelector(selector)).not.toBe(null)
        })
      })
    })
  })
})
