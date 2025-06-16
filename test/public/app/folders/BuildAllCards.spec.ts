'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

import { Folders } from '../../../../public/scripts/app/folders'
import assert from 'assert'
import Sinon from 'sinon'
import type { Listing } from '../../../../contracts/listing'

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

describe('public/app/folders function BuildAllCards()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let folderCard: DocumentFragment | null = null
  let buildCardStub = Sinon.stub()
  let tabFolders: HTMLDivElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    tabFolders = dom.window.document.querySelector('#tabFolders')
    Folders.FolderCard = null
    const template = document.querySelector<HTMLTemplateElement>('#FolderCard')
    assert(template !== null)
    folderCard = template.content
    Folders.FolderCard = folderCard
    buildCardStub = Sinon.stub(Folders, 'BuildCard').returns(null)
  })
  afterEach(() => {
    buildCardStub.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should handle undefined listing', () => {
    for (let i = 0; i < 5; i++) {
      tabFolders?.appendChild(dom.window.document.createElement('div'))
    }
    Folders.BuildAllCards(Cast<Listing>({ children: undefined }))
    expect(tabFolders?.children).to.have.lengthOf(5)
  })
  it('should handle empty listing', () => {
    for (let i = 0; i < 5; i++) {
      tabFolders?.appendChild(dom.window.document.createElement('div'))
    }
    Folders.BuildAllCards(Cast<Listing>({ children: [] }))
    expect(tabFolders?.children).to.have.lengthOf(6)
  })
  it('should append folder div to folder tab element', () => {
    tabFolders?.appendChild(dom.window.document.createElement('div'))
    Folders.BuildAllCards(Cast<Listing>({ children: [] }))
    expect(tabFolders?.lastElementChild?.nodeName).to.equal('DIV')
    expect(tabFolders?.lastElementChild?.classList.contains('folders')).to.equal(true)
  })
  it('should call BuildCard for each folder found in the folder list', () => {
    const data = { children: [{ A: 1 }, { B: 2 }, { C: 3 }] }
    Folders.BuildAllCards(Cast<Listing>(data))
    expect(buildCardStub.callCount).to.equal(3)
    expect(buildCardStub.calledWithExactly(data.children[0])).to.equal(true)
    expect(buildCardStub.calledWithExactly(data.children[1])).to.equal(true)
    expect(buildCardStub.calledWithExactly(data.children[2])).to.equal(true)
  })
  it('should not add folder card when BuildCard returns undefined', () => {
    const data = { children: [{ A: 1 }] }
    buildCardStub.returns(undefined)
    Folders.BuildAllCards(Cast<Listing>(data))
    expect(tabFolders?.lastElementChild?.children).to.have.lengthOf(0)
  })
  it('should not add folder card when BuildCard returns null', () => {
    const data = { children: [{ A: 1 }] }
    buildCardStub.returns(null)
    Folders.BuildAllCards(Cast<Listing>(data))
    expect(tabFolders?.lastElementChild?.children).to.have.lengthOf(0)
  })
  it('should add folder card from BuildCard', () => {
    const data = { children: [{ A: 1 }] }
    const e = dom.window.document.createElement('div')
    buildCardStub.returns(e)
    Folders.BuildAllCards(Cast<Listing>(data))
    expect(tabFolders?.lastElementChild?.children).to.have.lengthOf(1)
    expect(tabFolders?.lastElementChild?.firstElementChild).to.equal(e)
  })
})
