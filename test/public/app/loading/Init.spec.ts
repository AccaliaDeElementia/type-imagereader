'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { render } from 'pug'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { Init, Loading } from '#public/scripts/app/loading.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()
const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading function Init()', () => {
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Loading.overlay = null
    Loading.navbar = null
    Init()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
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
