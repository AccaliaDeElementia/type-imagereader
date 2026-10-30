'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Internals } from '#public/scripts/app/navigation.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import type { Listing } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  head
    title
  body
    div
      a.navbar-brand
      a.menuButton
    div#mainMenu
      div.tab-content
        div.folders
          div.folder-card
            h5 Folder Name
            div.text
            div.slider
`

describe('public/app/navigation/messageHandlers Navigate:Data scroll reset', () => {
  let dom = new JSDOM('', {})
  let subscribeStub: MockInstance = vi.fn()

  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    vi.spyOn(Internals, 'loadData').mockResolvedValue(undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockReturnValue(undefined)
    vi.spyOn(Imports, 'forward').mockReturnValue(undefined)
  })

  afterEach(() => {
    unmountDom()
    vi.restoreAllMocks()
  })

  it('should reset scroll position to top when Navigate:Data is published', async () => {
    init()
    const testData: Listing = {
      path: '/test',
      name: 'Test Folder',
      parent: '/',
      children: [],
      pictures: [],
    }
    const tabContent = document.querySelector('.tab-content')
    expect(tabContent).not.toBeNull()
    if (tabContent !== null) {
      tabContent.scrollTop = 100
      expect(tabContent.scrollTop).toBe(100)
    }
    const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
    await handler(testData)
    if (tabContent !== null) {
      expect(tabContent.scrollTop).toBe(0)
    }
  })

  it('should not fail when tab-content element is missing', async () => {
    const initialTabContent = document.querySelector('.tab-content')
    if (initialTabContent !== null) {
      initialTabContent.remove()
    }
    init()
    const testData: Listing = {
      path: '/test',
      name: 'Test Folder',
      parent: '/',
      children: [],
      pictures: [],
    }
    const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
    await expect(handler(testData)).resolves.not.toThrow()
  })

  it('should maintain scroll position at top after multiple navigations', async () => {
    init()
    const testData1: Listing = {
      path: '/test1',
      name: 'Test Folder 1',
      parent: '/',
      children: [],
      pictures: [],
    }
    const testData2: Listing = {
      path: '/test2',
      name: 'Test Folder 2',
      parent: '/',
      children: [],
      pictures: [],
    }
    const tabContent = document.querySelector('.tab-content')
    expect(tabContent).not.toBeNull()
    if (tabContent !== null) {
      tabContent.scrollTop = 200
      expect(tabContent.scrollTop).toBe(200)
    }
    const handler = capturedSubscriber(subscribeStub, 'Navigate:Data')
    await handler(testData1)
    if (tabContent !== null) {
      expect(tabContent.scrollTop).toBe(0)
    }
    await handler(testData2)
    if (tabContent !== null) {
      expect(tabContent.scrollTop).toBe(0)
    }
  })
})
