'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'

import { Folders, Imports, init, Internals } from '#public/scripts/app/folders.js'
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
      div#tabLink
        a(href="#tabFolders") Folders
      div#tabFolders
    template#FolderCard
      div.card
        div.card-top
          i.material-icons folder
        div.card-body
          h5 placeholder
        div.progress
          div.text placeholder%
          div.slider(style="width: 0")
`

describe('public/app/folders init()', () => {
  let buildFoldersSpy: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  beforeEach(() => {
    mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))

    resetPubSub()
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    Folders.folderCard = null
    buildFoldersSpy = vi.spyOn(Internals, 'buildFolders').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should subscribe to Navigate:Data', () => {
    init()
    expect(subscribeStub.mock.calls.some((c) => c[0] === 'Navigate:Data')).toBe(true)
  })
  it('should build folders on Navigate:Data with valid listing', async () => {
    init()
    const subscriberfn = capturedSubscriber(subscribeStub, 'Navigate:Data')
    const data: Listing = {
      name: 'FOO',
      path: 'BAR',
      parent: 'BAZ!@',
      children: [],
    }
    await subscriberfn(data)
    expect(buildFoldersSpy.mock.calls.some((c) => c[0] === data)).toBe(true)
  })
  it('should not build folders on Navigate:Data with invalid data', async () => {
    init()
    const subscriberfn = capturedSubscriber(subscribeStub, 'Navigate:Data')
    const data = {
      invalid: 'OBJECT',
    }
    await subscriberfn(data)
    expect(buildFoldersSpy.mock.calls.length > 0).toBe(false)
  })
  it('should locate and save the folder card for use when building markup', () => {
    init()
    expect(Folders.folderCard).not.toBe(null)
  })
  it('should set null for missing folder card for use when building markup', () => {
    document.querySelector('#FolderCard')?.remove()
    init()
    expect(Folders.folderCard).toBe(null)
  })
})
