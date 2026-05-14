'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { resetPubSub } from '#testutils/pubsub.js'

import { Imports, Internals } from '#public/scripts/app/folders.js'
import type { Listing } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
      div#tabLink
        a(href="#tabFolders") Folders
      div#tabFolders
`

describe('public/app/folders buildFolders()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let tabFolders: HTMLDivElement | null = null
  let hideTabStub: MockInstance = vi.fn()
  let unhideTabStub: MockInstance = vi.fn()
  let buildAllCardsStub: MockInstance = vi.fn()
  let publishStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))
    tabFolders = dom.window.document.querySelector('#tabFolders')
    hideTabStub = vi.spyOn(Internals, 'hideTab').mockImplementation((..._args: unknown[]) => undefined)
    unhideTabStub = vi.spyOn(Internals, 'unhideTab').mockImplementation((..._args: unknown[]) => undefined)
    buildAllCardsStub = vi.spyOn(Internals, 'buildAllCards').mockImplementation((..._args: unknown[]) => undefined)
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    resetPubSub()
    unmountDom()
  })
  it('should remove all existing folder cards on call', () => {
    for (let i = 0; i < 20; i += 1) {
      const e = dom.window.document.createElement('div')
      e.classList.add('folders')
      tabFolders?.appendChild(e)
    }
    expect(tabFolders?.children).toHaveLength(20)
    Internals.buildFolders(cast<Listing>({}))
    expect(tabFolders?.children).toHaveLength(0)
  })
  it('should call buildAllCards once', () => {
    const data = { a: 42 }
    Internals.buildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.mock.calls.length).toBe(1)
  })
  it('should call buildAllCards with one argument', () => {
    const data = { a: 42 }
    Internals.buildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.mock.calls[0]).toHaveLength(1)
  })
  it('should pass data to BuilAllCards', () => {
    const data = { a: 42 }
    Internals.buildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.mock.calls[0]?.[0]).toBe(data)
  })
  it('should call hideTab when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(hideTabStub.mock.calls.length > 0).toBe(true)
  })
  it('should hide folder tab when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(hideTabStub).toHaveBeenCalledWith('a[href="#tabFolders"]')
  })
  it('should call hideTab when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(hideTabStub.mock.calls.length > 0).toBe(true)
  })
  it('should hide folder tab when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(hideTabStub).toHaveBeenCalledWith('a[href="#tabFolders"]')
  })
  it('should call hideTab when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(hideTabStub.mock.calls.length > 0).toBe(true)
  })
  it('should hide folder tab when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(hideTabStub).toHaveBeenCalledWith('a[href="#tabFolders"]')
  })
  it('should not unhide folder tab when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(unhideTabStub.mock.calls.length > 0).toBe(false)
  })
  it('should not unhide folder tab when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(unhideTabStub.mock.calls.length > 0).toBe(false)
  })
  it('should not unhide folder tab when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(unhideTabStub.mock.calls.length > 0).toBe(false)
  })
  it('should not publish tab select when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(publishStub.mock.calls.length > 0).toBe(false)
  })
  it('should not publish tab select when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(publishStub.mock.calls.length > 0).toBe(false)
  })
  it('should not publish tab select when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(publishStub.mock.calls.length > 0).toBe(false)
  })
  it('should not publish tab select when data has children and pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: [{}] }))
    expect(publishStub.mock.calls.length > 0).toBe(false)
  })
  it('should publish tab select once when data has children and empty pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: [] }))
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish tab select with expected args when data has children and empty pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: [] }))
    expect(publishStub).toHaveBeenCalledWith('Tab:Select', 'Folders')
  })
  it('should publish tab select once when data has children and undefined pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: undefined }))
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish tab select with expected args when data has children and undefined pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: undefined }))
    expect(publishStub).toHaveBeenCalledWith('Tab:Select', 'Folders')
  })
  it('should publish tab select once when data has children and missing pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(publishStub.mock.calls.length).toBe(1)
  })
  it('should publish tab select with expected args when data has children and missing pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(publishStub).toHaveBeenCalledWith('Tab:Select', 'Folders')
  })
  it('should not hide folder tab when data has children', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(hideTabStub.mock.calls.length > 0).toBe(false)
  })
  it('should call unhideTab when data has children', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(unhideTabStub.mock.calls.length > 0).toBe(true)
  })
  it('should unhide folder tab when data has children', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(unhideTabStub).toHaveBeenCalledWith('a[href="#tabFolders"]')
  })
})
