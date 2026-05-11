'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { resetPubSub } from '#testutils/pubsub.js'

import { Imports, Internals } from '#public/scripts/app/folders.js'
import Sinon from 'sinon'
import type { Listing } from '#contracts/listing.js'

const sandbox = Sinon.createSandbox()

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
  let hideTabStub = sandbox.stub()
  let unhideTabStub = sandbox.stub()
  let buildAllCardsStub = sandbox.stub()
  let publishStub = sandbox.stub()
  beforeEach(() => {
    dom = mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))
    tabFolders = dom.window.document.querySelector('#tabFolders')
    hideTabStub = sandbox.stub(Internals, 'hideTab')
    unhideTabStub = sandbox.stub(Internals, 'unhideTab')
    buildAllCardsStub = sandbox.stub(Internals, 'buildAllCards')
    publishStub = sandbox.stub(Imports, 'publish')
  })
  afterEach(() => {
    sandbox.restore()
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
    expect(buildAllCardsStub.callCount).toBe(1)
  })
  it('should call buildAllCards with one argument', () => {
    const data = { a: 42 }
    Internals.buildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.firstCall.args).toHaveLength(1)
  })
  it('should pass data to BuilAllCards', () => {
    const data = { a: 42 }
    Internals.buildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.firstCall.args[0]).toBe(data)
  })
  it('should call hideTab when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(hideTabStub.called).toBe(true)
  })
  it('should hide folder tab when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).toBe(true)
  })
  it('should call hideTab when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(hideTabStub.called).toBe(true)
  })
  it('should hide folder tab when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).toBe(true)
  })
  it('should call hideTab when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(hideTabStub.called).toBe(true)
  })
  it('should hide folder tab when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).toBe(true)
  })
  it('should not unhide folder tab when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(unhideTabStub.called).toBe(false)
  })
  it('should not unhide folder tab when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(unhideTabStub.called).toBe(false)
  })
  it('should not unhide folder tab when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(unhideTabStub.called).toBe(false)
  })
  it('should not publish tab select when data has no children', () => {
    Internals.buildFolders(cast<Listing>({ children: [] }))
    expect(publishStub.called).toBe(false)
  })
  it('should not publish tab select when data has undefined children', () => {
    Internals.buildFolders(cast<Listing>({ children: undefined }))
    expect(publishStub.called).toBe(false)
  })
  it('should not publish tab select when data has missing children', () => {
    Internals.buildFolders(cast<Listing>({}))
    expect(publishStub.called).toBe(false)
  })
  it('should not publish tab select when data has children and pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: [{}] }))
    expect(publishStub.called).toBe(false)
  })
  it('should publish tab select once when data has children and empty pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: [] }))
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish tab select with expected args when data has children and empty pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: [] }))
    expect(publishStub.calledWithExactly('Tab:Select', 'Folders')).toBe(true)
  })
  it('should publish tab select once when data has children and undefined pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: undefined }))
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish tab select with expected args when data has children and undefined pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}], pictures: undefined }))
    expect(publishStub.calledWithExactly('Tab:Select', 'Folders')).toBe(true)
  })
  it('should publish tab select once when data has children and missing pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(publishStub.callCount).toBe(1)
  })
  it('should publish tab select with expected args when data has children and missing pictures', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(publishStub.calledWithExactly('Tab:Select', 'Folders')).toBe(true)
  })
  it('should not hide folder tab when data has children', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(hideTabStub.called).toBe(false)
  })
  it('should call unhideTab when data has children', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(unhideTabStub.called).toBe(true)
  })
  it('should unhide folder tab when data has children', () => {
    Internals.buildFolders(cast<Listing>({ children: [{}] }))
    expect(unhideTabStub.calledWithExactly('a[href="#tabFolders"]')).toBe(true)
  })
})
