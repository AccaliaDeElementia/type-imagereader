'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { Loading } from '#public/scripts/app/loading.js'
import { Cast } from '#testutils/TypeGuards.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()
const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading function Init()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    resetPubSub()
    Loading.overlay = null
    Loading.navbar = null
    Loading.Init()
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should subscribe to Loading:Error', () => {
    expect(PubSub.subscribers['LOADING:ERROR']).to.have.length(1)
  })
  it('should subscribe to Loading:Success', () => {
    expect(PubSub.subscribers['LOADING:SUCCESS']).to.have.length(1)
  })
  it('should subscribe to Loading:Hide', () => {
    expect(PubSub.subscribers['LOADING:HIDE']).to.have.length(1)
  })
  it('should subscribe to Loading:Show', () => {
    expect(PubSub.subscribers['LOADING:SHOW']).to.have.length(1)
  })
  it('should select overlay for disabling input', () => {
    expect(Loading.overlay).to.not.equal(null)
  })
  it('should select navbar for feedback', () => {
    expect(Loading.navbar).to.not.equal(null)
  })
})
