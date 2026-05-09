'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { getSubscriber, resetPubSub } from '#testutils/PubSub.js'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { Folders, init, Internals } from '#public/scripts/app/folders.js'
import Sinon from 'sinon'
import type { Listing } from '#contracts/listing.js'

const sandbox = Sinon.createSandbox()

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
    template#folderCard
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
  let buildFoldersSpy: Sinon.SinonStub = sandbox.stub()
  beforeEach(() => {
    mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))

    resetPubSub()
    Folders.folderCard = null
    buildFoldersSpy = sandbox.stub(Internals, 'BuildFolders')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should subscribe to Navigate:Data', () => {
    init()
    expect(PubSub.subscribers['NAVIGATE:DATA']).to.have.length(1)
  })
  it('should build folders on Navigate:Data with valid listing', async () => {
    init()
    const subscriberfn = getSubscriber('NAVIGATE:DATA')
    const data: Listing = {
      name: 'FOO',
      path: 'BAR',
      parent: 'BAZ!@',
      children: [],
    }
    await subscriberfn(data)
    expect(buildFoldersSpy.calledWith(data)).to.equal(true)
  })
  it('should not build folders on Navigate:Data with invalid data', async () => {
    init()
    const subscriberfn = getSubscriber('NAVIGATE:DATA')
    const data = {
      invalid: 'OBJECT',
    }
    await subscriberfn(data)
    expect(buildFoldersSpy.called).to.equal(false)
  })
  it('should locate and save the folder card for use when building markup', () => {
    init()
    expect(Folders.folderCard).to.not.equal(null)
  })
  it('should set null for missing folder card for use when building markup', () => {
    document.querySelector('#folderCard')?.remove()
    init()
    expect(Folders.folderCard).to.equal(null)
  })
})
