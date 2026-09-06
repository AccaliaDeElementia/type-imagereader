'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, Internals, Viewport } from '#public/scripts/app/imageViewport.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div#bigImage
      img.hidden
`

describe('public/app/imageViewport applySizeMode()', () => {
  let dom = new JSDOM(render(markup), {})
  let container: HTMLElement | null = null
  let getShowOriginalSizeStub: MockInstance = vi.fn()
  let resetScrollSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    container = dom.window.document.querySelector<HTMLElement>('#bigImage')
    Viewport.container = container
    getShowOriginalSizeStub = vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(false)
    resetScrollSpy = vi.spyOn(Internals, 'resetScroll').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    unmountDom()
    Viewport.container = null
  })
  it('should tolerate a missing container', () => {
    Viewport.container = null
    expect(() => {
      Internals.applySizeMode()
    }).not.toThrow()
  })
  it('should mark the container as actual size when the preference is set', () => {
    getShowOriginalSizeStub.mockReturnValue(true)
    Internals.applySizeMode()
    assert(container !== null)
    expect(container.classList.contains('actualSize')).toBe(true)
  })
  it('should not reset scroll when entering actual size mode', () => {
    getShowOriginalSizeStub.mockReturnValue(true)
    Internals.applySizeMode()
    expect(resetScrollSpy.mock.calls.length).toBe(0)
  })
  it('should unmark the container when the preference is unset', () => {
    assert(container !== null)
    container.classList.add('actualSize')
    getShowOriginalSizeStub.mockReturnValue(false)
    Internals.applySizeMode()
    expect(container.classList.contains('actualSize')).toBe(false)
  })
  // Leaving actual size mode makes the container unscrollable, so a stale
  // offset would strand the fitted image off screen in some browsers.
  it('should reset scroll when leaving actual size mode', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    Internals.applySizeMode()
    expect(resetScrollSpy.mock.calls.length).toBe(1)
  })
})
