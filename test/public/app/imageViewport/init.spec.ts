'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { init, Imports, Internals, Viewport } from '#public/scripts/app/imageViewport.js'
import { capturedSubscriber } from '#testutils/pubsub.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div#bigImage
      img.hidden
`

describe('public/app/imageViewport init()', () => {
  let dom = new JSDOM(render(markup), {})
  let applySizeModeSpy: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    Viewport.container = null
    applySizeModeSpy = vi.spyOn(Internals, 'applySizeMode').mockImplementation((..._args: unknown[]) => undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
    Viewport.container = null
  })
  it('should capture the scroll container', () => {
    init()
    expect(Viewport.container).toBe(dom.window.document.querySelector('#bigImage'))
  })
  it('should tolerate a missing scroll container', () => {
    const node = dom.window.document.querySelector('#bigImage')
    node?.parentElement?.removeChild(node)
    init()
    expect(Viewport.container).toBe(null)
  })
  it('should apply the current size mode on init', () => {
    init()
    expect(applySizeModeSpy.mock.calls.length).toBe(1)
  })
  it('should only subscribe to the size mode topic', () => {
    init()
    expect(subscribeStub.mock.calls.map((c) => cast<string>(c[0]))).toEqual(['Pictures:SizeMode'])
  })
  it('should reapply the size mode when the topic fires', async () => {
    init()
    applySizeModeSpy.mockClear()
    const handler = capturedSubscriber(subscribeStub, 'Pictures:SizeMode')
    await handler(undefined)
    expect(applySizeModeSpy.mock.calls.length).toBe(1)
  })
})
