'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { init, Loading } from '#public/scripts/app/loading.js'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()
const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading init()', () => {
  let dom: JSDOM = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Loading.overlay = null
    Loading.navbar = null
    init()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should subscribe to Loading:Error', () => {
    expect(PubSub.subscribers['LOADING:ERROR']).toHaveLength(1)
  })
  it('should subscribe to Loading:Success', () => {
    expect(PubSub.subscribers['LOADING:SUCCESS']).toHaveLength(1)
  })
  it('should subscribe to Loading:Hide', () => {
    expect(PubSub.subscribers['LOADING:HIDE']).toHaveLength(1)
  })
  it('should subscribe to Loading:show', () => {
    expect(PubSub.subscribers['LOADING:SHOW']).toHaveLength(1)
  })
  it('should select overlay for disabling input', () => {
    expect(Loading.overlay).not.toBe(null)
  })
  it('should select navbar for feedback', () => {
    expect(Loading.navbar).not.toBe(null)
  })
})
