'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'

import { Folders, Imports, init, Internals } from '#public/scripts/app/folders.js'
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
  let buildFoldersSpy: Sinon.SinonStub = sandbox.stub()
  let subscribeStub = sandbox.stub()
  beforeEach(() => {
    mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))

    resetPubSub()
    subscribeStub = sandbox.stub(Imports, 'subscribe')
    Folders.folderCard = null
    buildFoldersSpy = sandbox.stub(Internals, 'buildFolders')
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should subscribe to Navigate:Data', () => {
    init()
    expect(subscribeStub.calledWith('Navigate:Data')).toBe(true)
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
    expect(buildFoldersSpy.calledWith(data)).toBe(true)
  })
  it('should not build folders on Navigate:Data with invalid data', async () => {
    init()
    const subscriberfn = capturedSubscriber(subscribeStub, 'Navigate:Data')
    const data = {
      invalid: 'OBJECT',
    }
    await subscriberfn(data)
    expect(buildFoldersSpy.called).toBe(false)
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
