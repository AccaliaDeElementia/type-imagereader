'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { Imports, Internals, Viewport } from '#public/scripts/app/imageViewport.js'
import type { SizeMode } from '#public/scripts/app/sizeMode.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

const markup = `
html
  body
    div#bigImage
      img.hidden
`

const MODE_CLASSES = ['fitWidth', 'fitHeight', 'actualSize']

describe('public/app/imageViewport applySizeMode()', () => {
  let dom = new JSDOM(render(markup), {})
  let container: HTMLElement | null = null
  let getSizeModeStub: MockInstance = vi.fn()
  let resetScrollSpy: MockInstance = vi.fn()
  const classesOn = (): string[] => {
    assert(container !== null)
    const { classList } = container
    return MODE_CLASSES.filter((name) => classList.contains(name))
  }
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    container = dom.window.document.querySelector<HTMLElement>('#bigImage')
    Viewport.container = container
    getSizeModeStub = vi.spyOn(Imports, 'getSizeMode').mockReturnValue('fitScreen')
    resetScrollSpy = vi.spyOn(Internals, 'resetScroll').mockReturnValue(undefined)
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

  const expectedClasses: Array<[SizeMode, string[], string]> = [
    ['fitScreen', [], 'with no mode class'],
    ['fitWidth', ['fitWidth'], 'as fitWidth'],
    ['fitHeight', ['fitHeight'], 'as fitHeight'],
    ['actualSize', ['actualSize'], 'as actualSize'],
  ]
  expectedClasses.forEach(([mode, classes, description]) => {
    it(`should mark the container ${description} in ${mode}`, () => {
      getSizeModeStub.mockReturnValue(mode)
      Internals.applySizeMode()
      expect(classesOn()).toEqual(classes)
    })
    it(`should clear a stale mode class when switching to ${mode}`, () => {
      assert(container !== null)
      for (const name of MODE_CLASSES) container.classList.add(name)
      getSizeModeStub.mockReturnValue(mode)
      Internals.applySizeMode()
      expect(classesOn()).toEqual(classes)
    })
  })

  it('should not reset scroll when entering actual size mode', () => {
    getSizeModeStub.mockReturnValue('actualSize')
    Internals.applySizeMode()
    expect(resetScrollSpy.mock.calls.length).toBe(0)
  })
  const resetting: SizeMode[] = ['fitScreen', 'fitWidth', 'fitHeight']
  resetting.forEach((mode) => {
    it(`should reset scroll when entering ${mode}`, () => {
      getSizeModeStub.mockReturnValue(mode)
      Internals.applySizeMode()
      expect(resetScrollSpy.mock.calls.length).toBe(1)
    })
  })
})
