'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, after, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

import { PubSub } from '../../../../public/scripts/app/pubsub'
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

describe('public/app/folders function Init()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let buildFoldersSpy: Sinon.SinonStub = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document

    PubSub.subscribers = {}
    PubSub.deferred = []
    Folders.FolderCard = null
    buildFoldersSpy = Sinon.stub(Folders, 'BuildFolders')
  })
  afterEach(() => {
    buildFoldersSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should subscribe to Navigate:Data', () => {
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.equal(undefined)
    Folders.Init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  })
  it('should build folders on Navigate:Data', async () => {
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.equal(undefined)
    Folders.Init()
    const subscriberfn = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(subscriberfn !== undefined)
    expect(buildFoldersSpy.called).to.equal(false)
    const data: Listing = {
      name: 'FOO',
      path: 'BAR',
      parent: 'BAZ!@',
      children: [],
    }
    await subscriberfn(data)
    expect(buildFoldersSpy.calledWith(data)).to.equal(true)
  })
  it('should build folders on Navigate:Data', async () => {
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.equal(undefined)
    Folders.Init()
    const subscriberfn = PubSub.subscribers['NAVIGATE:DATA']?.pop()
    assert(subscriberfn !== undefined)
    expect(buildFoldersSpy.called).to.equal(false)
    const data = {
      invalid: 'OBJECT',
    }
    await subscriberfn(data)
    expect(buildFoldersSpy.called).to.equal(false)
  })
  it('should locate and save the folder card for use when building markup', () => {
    expect(Folders.FolderCard).to.equal(null)
    Folders.Init()
    expect(Folders.FolderCard).to.not.equal(null)
  })
  it('should set null for missing folder card for use when building markup', () => {
    document.querySelector('#FolderCard')?.remove()
    expect(Folders.FolderCard).to.equal(null)
    Folders.Init()
    expect(Folders.FolderCard).to.equal(null)
  })
})
