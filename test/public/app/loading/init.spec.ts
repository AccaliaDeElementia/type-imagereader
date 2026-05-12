'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Loading } from '#public/scripts/app/loading.js'
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
  let subscribeStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Loading.overlay = null
    Loading.navbar = null
    subscribeStub = sandbox.stub(Imports, 'subscribe')
    init()
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should subscribe to Loading:Error', () => {
    expect(subscribeStub.calledWith('Loading:Error')).toBe(true)
  })
  it('should subscribe to Loading:Success', () => {
    expect(subscribeStub.calledWith('Loading:Success')).toBe(true)
  })
  it('should subscribe to Loading:Hide', () => {
    expect(subscribeStub.calledWith('Loading:Hide')).toBe(true)
  })
  it('should subscribe to Loading:show', () => {
    expect(subscribeStub.calledWith('Loading:show')).toBe(true)
  })
  it('should select overlay for disabling input', () => {
    expect(Loading.overlay).not.toBe(null)
  })
  it('should select navbar for feedback', () => {
    expect(Loading.navbar).not.toBe(null)
  })
})
