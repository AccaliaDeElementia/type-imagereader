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
  it('should build all cards for the listing exactly once', () => {
    const data = cast<Listing>({ a: 42 })
    Internals.buildFolders(data)
    expect(buildAllCardsStub.mock.calls).toEqual([[data]])
  })
  const childlessListings: Array<[string, object]> = [
    ['an empty array', { children: [] }],
    ['undefined', { children: undefined }],
    ['absent', {}],
  ]
  childlessListings.forEach(([shape, listing]) => {
    it(`should hide the folders tab exactly once when children is ${shape}`, () => {
      Internals.buildFolders(cast<Listing>(listing))
      expect(hideTabStub.mock.calls).toEqual([['a[href="#tabFolders"]']])
    })
    it(`should neither unhide nor select the folders tab when children is ${shape}`, () => {
      Internals.buildFolders(cast<Listing>(listing))
      expect({
        unhidden: unhideTabStub.mock.calls.length,
        published: publishStub.mock.calls.length,
      }).toEqual({ unhidden: 0, published: 0 })
    })
  })
  it('should not select the folders tab when the listing has both children and pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: [{}] }))
    expect(publishStub.mock.calls).toEqual([])
  })
  const pictureless: Array<[string, object]> = [
    ['an empty array', { children: [{}], pictures: [] }],
    ['undefined', { children: [{}], pictures: undefined }],
    ['absent', { children: [{}] }],
  ]
  pictureless.forEach(([shape, listing]) => {
    it(`should select the folders tab exactly once when children exist and pictures is ${shape}`, () => {
      Internals.buildFolders(cast<Listing>(listing))
      expect(publishStub.mock.calls).toEqual([['Tab:Select', 'Folders']])
    })
  })
  it('should unhide rather than hide the folders tab when children exist', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect({ hidden: hideTabStub.mock.calls, unhidden: unhideTabStub.mock.calls }).toEqual({
      hidden: [],
      unhidden: [['a[href="#tabFolders"]']],
    })
  })
})
