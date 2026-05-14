'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, init, Loading } from '#public/scripts/app/loading.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    nav#navbar
    div#loadingScreen
`
describe('public/app/loading init()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let subscribeStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Loading.overlay = null
    Loading.navbar = null
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    init()
  })
  afterEach(() => {
    unmountDom()
  })
  it('should subscribe to Loading:Error', () => {
    expect(subscribeStub).toHaveBeenCalledWith('Loading:Error', expect.anything())
  })
  it('should subscribe to Loading:Success', () => {
    expect(subscribeStub).toHaveBeenCalledWith('Loading:Success', expect.anything())
  })
  it('should subscribe to Loading:Hide', () => {
    expect(subscribeStub).toHaveBeenCalledWith('Loading:Hide', expect.anything())
  })
  it('should subscribe to Loading:show', () => {
    expect(subscribeStub).toHaveBeenCalledWith('Loading:show', expect.anything())
  })
  it('should select overlay for disabling input', () => {
    expect(Loading.overlay).not.toBe(null)
  })
  it('should select navbar for feedback', () => {
    expect(Loading.navbar).not.toBe(null)
  })
})
