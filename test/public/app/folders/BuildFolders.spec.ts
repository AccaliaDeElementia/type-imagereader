'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

import { Folders } from '../../../../public/scripts/app/folders'
import Sinon from 'sinon'
import type { Listing } from '../../../../contracts/listing'
import { PubSub } from '../../../../public/scripts/app/pubsub'

const markup = `
html
  body
      div#tabLink
        a(href="#tabFolders") Folders
      div#tabFolders
`

describe('public/app/folders function BuildFolders()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let tabFolders: HTMLDivElement | null = null
  let hideTabStub = Sinon.stub()
  let unhideTabStub = Sinon.stub()
  let buildAllCardsStub = Sinon.stub()
  let tabSelectStub = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    tabFolders = dom.window.document.querySelector('#tabFolders')
    hideTabStub = Sinon.stub(Folders, 'HideTab')
    unhideTabStub = Sinon.stub(Folders, 'UnhideTab')
    buildAllCardsStub = Sinon.stub(Folders, 'BuildAllCards')
    tabSelectStub = Sinon.stub().resolves()
    PubSub.subscribers['TAB:SELECT'] = [tabSelectStub]
  })
  afterEach(() => {
    PubSub.subscribers = {}
    buildAllCardsStub.restore()
    unhideTabStub.restore()
    hideTabStub.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should remove all existing folder cards on call', () => {
    for (let i = 0; i < 20; i++) {
      const e = dom.window.document.createElement('div')
      e.classList.add('folders')
      tabFolders?.appendChild(e)
    }
    expect(tabFolders?.children).to.have.lengthOf(20)
    Folders.BuildFolders(Cast<Listing>({}))
    expect(tabFolders?.children).to.have.lengthOf(0)
  })
  it('should pass data to BuilAllCards', () => {
    const data = { a: 42 }
    Folders.BuildFolders(Cast<Listing>(data))
    expect(buildAllCardsStub.callCount).to.equal(1)
    expect(buildAllCardsStub.firstCall.args).to.have.lengthOf(1)
    expect(buildAllCardsStub.firstCall.args[0]).to.equal(data)
  })
  it('should hide folder tab when data has no children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [] }))
    expect(hideTabStub.called).to.equal(true)
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
  it('should hide folder tab when data has undefined children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: undefined }))
    expect(hideTabStub.called).to.equal(true)
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
  it('should hide folder tab when data has missing children', () => {
    Folders.BuildFolders(Cast<Listing>({}))
    expect(hideTabStub.called).to.equal(true)
    expect(hideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
  it('should not unhide folder tab when data has no children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [] }))
    expect(unhideTabStub.called).to.equal(false)
  })
  it('should not unhide folder tab when data has undefined children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: undefined }))
    expect(unhideTabStub.called).to.equal(false)
  })
  it('should not unhide folder tab when data has missing children', () => {
    Folders.BuildFolders(Cast<Listing>({}))
    expect(unhideTabStub.called).to.equal(false)
  })
  it('should not publish tab select when data has no children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [] }))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should not publish tab select when data has undefined children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: undefined }))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should not publish tab select when data has missing children', () => {
    Folders.BuildFolders(Cast<Listing>({}))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should not publish tab select when data has children and pictures', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [{}], pictures: [{}] }))
    expect(tabSelectStub.called).to.equal(false)
  })
  it('should publish tab select when data has children and empty pictures', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [{}], pictures: [] }))
    expect(tabSelectStub.callCount).to.equal(1)
    expect(tabSelectStub.calledWithExactly('Folders', 'TAB:SELECT')).to.equal(true)
  })
  it('should publish tab select when data has children and undefined pictures', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [{}], pictures: undefined }))
    expect(tabSelectStub.callCount).to.equal(1)
    expect(tabSelectStub.calledWithExactly('Folders', 'TAB:SELECT')).to.equal(true)
  })
  it('should publish tab select when data has children and missing pictures', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [{}] }))
    expect(tabSelectStub.callCount).to.equal(1)
    expect(tabSelectStub.calledWithExactly('Folders', 'TAB:SELECT')).to.equal(true)
  })
  it('should not hide folder tab when data has children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [{}] }))
    expect(hideTabStub.called).to.equal(false)
  })
  it('should unhide folder tab when data has children', () => {
    Folders.BuildFolders(Cast<Listing>({ children: [{}] }))
    expect(unhideTabStub.called).to.equal(true)
    expect(unhideTabStub.calledWithExactly('a[href="#tabFolders"]')).to.equal(true)
  })
})
