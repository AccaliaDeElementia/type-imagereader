'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { resetPubSub } from '#testutils/pubsub.js'

import { Internals } from '#public/scripts/app/folders.js'
import Sinon from 'sinon'
import type { Listing } from '#contracts/listing.js'
import { PubSub } from '#public/scripts/app/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
      div#tabLink
        a(href="#tabFolders") Folders
      div#tabFolders
`

describe('public/app/folders BuildFolders()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let tabFolders: HTMLDivElement | null = null
  let hideTabStub = sandbox.stub()
  let unhideTabStub = sandbox.stub()
  let buildAllCardsStub = sandbox.stub()
  let tabSelectStub = sandbox.stub()
  beforeEach(() => {
    dom = mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))
    tabFolders = dom.window.document.querySelector('#tabFolders')
    hideTabStub = sandbox.stub(Internals, 'HideTab')
    unhideTabStub = sandbox.stub(Internals, 'UnhideTab')
    buildAllCardsStub = sandbox.stub(Internals, 'BuildAllCards')
    tabSelectStub = sandbox.stub().resolves()
    PubSub.subscribers['TAB:SELECT'] = [tabSelectStub]
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
    expect(tabFolders?.children).to.have.lengthOf(20)
    Internals.BuildFolders(cast<Listing>({}))
    expect(tabFolders?.children).to.have.lengthOf(0)
  })
  it('should call BuildAllCards once', () => {
    const data = { a: 42 }
    Internals.BuildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.callCount).to.equal(1)
  })
  it('should call BuildAllCards with one argument', () => {
    const data = { a: 42 }
    Internals.BuildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should pass data to BuilAllCards', () => {
    const data = { a: 42 }
    Internals.BuildFolders(cast<Listing>(data))
    expect(buildAllCardsStub.firstCall.args[0]).to.equal(data)
  })
  it('should call HideTab when data has no children', () => {
    Internals.BuildFolders(cast<Listing>({ children: [] }))
    expect(hideTabStub.called).to.equal(true)
  })
  it('should hide folder tab when data has no children', () => {
    Internals.BuildFolders(cast<Listing>({ children: [] }))
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
  it('should call HideTab when data has undefined children', () => {
    Internals.BuildFolders(cast<Listing>({ children: undefined }))
    expect(hideTabStub.called).to.equal(true)
  })
  it('should hide folder tab when data has undefined children', () => {
    Internals.BuildFolders(cast<Listing>({ children: undefined }))
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
  it('should call HideTab when data has missing children', () => {
    Internals.BuildFolders(cast<Listing>({}))
    expect(hideTabStub.called).to.equal(true)
  })
  it('should hide folder tab when data has missing children', () => {
    Internals.BuildFolders(cast<Listing>({}))
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
  it('should not unhide folder tab when data has no children', () => {
    Internals.BuildFolders(cast<Listing>({ children: [] }))
    expect(unhideTabStub.called).to.equal(false)
  })
  it('should not unhide folder tab when data has undefined children', () => {
    Internals.BuildFolders(cast<Listing>({ children: undefined }))
    expect(unhideTabStub.called).to.equal(false)
  })
  it('should not unhide folder tab when data has missing children', () => {
    Internals.BuildFolders(cast<Listing>({}))
    expect(unhideTabStub.called).to.equal(false)
  })
  it('should not publish tab select when data has no children', () => {
    Internals.BuildFolders(cast<Listing>({ children: [] }))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should not publish tab select when data has undefined children', () => {
    Internals.BuildFolders(cast<Listing>({ children: undefined }))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should not publish tab select when data has missing children', () => {
    Internals.BuildFolders(cast<Listing>({}))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should not publish tab select when data has children and pictures', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}], pictures: [{}] }))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should publish tab select once when data has children and empty pictures', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}], pictures: [] }))
    expect(tabSelectStub.callCount).to.equal(1)
  })
  it('should publish tab select with expected args when data has children and empty pictures', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}], pictures: [] }))
    expect(tabSelectStub.calledWithExactly('Folders', 'TAB:SELECT')).to.equal(true)
  })
  it('should publish tab select once when data has children and undefined pictures', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}], pictures: undefined }))
    expect(tabSelectStub.callCount).to.equal(1)
  })
  it('should publish tab select with expected args when data has children and undefined pictures', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}], pictures: undefined }))
    expect(tabSelectStub.calledWithExactly('Folders', 'TAB:SELECT')).to.equal(true)
  })
  it('should publish tab select once when data has children and missing pictures', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}] }))
    expect(tabSelectStub.callCount).to.equal(1)
  })
  it('should publish tab select with expected args when data has children and missing pictures', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}] }))
    expect(tabSelectStub.calledWithExactly('Folders', 'TAB:SELECT')).to.equal(true)
  })
  it('should not hide folder tab when data has children', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}] }))
    expect(hideTabStub.called).to.equal(false)
  })
  it('should call UnhideTab when data has children', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}] }))
    expect(unhideTabStub.called).to.equal(true)
  })
  it('should unhide folder tab when data has children', () => {
    Internals.BuildFolders(cast<Listing>({ children: [{}] }))
    expect(unhideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
})
