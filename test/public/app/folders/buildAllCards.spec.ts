'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { Folders, Internals } from '#public/scripts/app/folders.js'
import assert from 'node:assert'
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

describe('public/app/folders buildAllCards()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let folderCard: DocumentFragment | null = null
  let buildCardStub: MockInstance = vi.fn()
  let tabFolders: HTMLDivElement | null = null
  beforeEach(() => {
    dom = mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))

    tabFolders = dom.window.document.querySelector('#tabFolders')
    Folders.folderCard = null
    const template = document.querySelector<HTMLTemplateElement>('#FolderCard')
    assert(template !== null)
    folderCard = template.content
    Folders.folderCard = folderCard
    buildCardStub = vi.spyOn(Internals, 'buildCard').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should handle undefined listing', () => {
    for (let i = 0; i < 5; i += 1) {
      tabFolders?.appendChild(dom.window.document.createElement('div'))
    }
    Internals.buildAllCards(cast<Listing>({ children: undefined }))
    expect(tabFolders?.children).toHaveLength(5)
  })
  it('should handle empty listing', () => {
    for (let i = 0; i < 5; i += 1) {
      tabFolders?.appendChild(dom.window.document.createElement('div'))
    }
    Internals.buildAllCards(cast<Listing>({ children: [] }))
    expect(tabFolders?.children).toHaveLength(6)
  })
  it('should append folder div to folder tab element', () => {
    tabFolders?.appendChild(dom.window.document.createElement('div'))
    Internals.buildAllCards(cast<Listing>({ children: [] }))
    expect(tabFolders?.lastElementChild?.nodeName).toBe('DIV')
  })
  it('should append folder div with folders class to folder tab element', () => {
    tabFolders?.appendChild(dom.window.document.createElement('div'))
    Internals.buildAllCards(cast<Listing>({ children: [] }))
    expect(tabFolders?.lastElementChild?.classList.contains('folders')).toBe(true)
  })
  it('should call buildCard for each folder found in the folder list', () => {
    const data = { children: [{ A: 1 }, { B: 2 }, { C: 3 }] }
    Internals.buildAllCards(cast<Listing>(data))
    expect(buildCardStub.mock.calls.length).toBe(3)
  })
  it('should call buildCard with first child', () => {
    const data = { children: [{ A: 1 }, { B: 2 }, { C: 3 }] }
    Internals.buildAllCards(cast<Listing>(data))
    expect(buildCardStub).toHaveBeenCalledWith(data.children[0])
  })
  it('should call buildCard with second child', () => {
    const data = { children: [{ A: 1 }, { B: 2 }, { C: 3 }] }
    Internals.buildAllCards(cast<Listing>(data))
    expect(buildCardStub).toHaveBeenCalledWith(data.children[1])
  })
  it('should call buildCard with third child', () => {
    const data = { children: [{ A: 1 }, { B: 2 }, { C: 3 }] }
    Internals.buildAllCards(cast<Listing>(data))
    expect(buildCardStub).toHaveBeenCalledWith(data.children[2])
  })
  it('should not add folder card when buildCard returns undefined', () => {
    const data = { children: [{ A: 1 }] }
    buildCardStub.mockReturnValue(undefined)
    Internals.buildAllCards(cast<Listing>(data))
    expect(tabFolders?.lastElementChild?.children).toHaveLength(0)
  })
  it('should not add folder card when buildCard returns null', () => {
    const data = { children: [{ A: 1 }] }
    buildCardStub.mockReturnValue(null)
    Internals.buildAllCards(cast<Listing>(data))
    expect(tabFolders?.lastElementChild?.children).toHaveLength(0)
  })
  it('should add one folder card from buildCard', () => {
    const data = { children: [{ A: 1 }] }
    const e = dom.window.document.createElement('div')
    buildCardStub.mockReturnValue(e)
    Internals.buildAllCards(cast<Listing>(data))
    expect(tabFolders?.lastElementChild?.children).toHaveLength(1)
  })
  it('should add folder card from buildCard', () => {
    const data = { children: [{ A: 1 }] }
    const e = dom.window.document.createElement('div')
    buildCardStub.mockReturnValue(e)
    Internals.buildAllCards(cast<Listing>(data))
    expect(tabFolders?.lastElementChild?.firstElementChild).toBe(e)
  })
})
