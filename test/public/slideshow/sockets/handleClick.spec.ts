'use sanity'

import { Internals, WebSockets, type WebSocket } from '#public/scripts/slideshow/sockets.js'
import { cast } from '#testutils/typeGuards.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'
describe('public/slideshow/sockets handleClick()', () => {
  const fakeEmit = vi.fn()
  const fakeSocket = cast<WebSocket>({ emit: fakeEmit })
  let fakeAssign: MockInstance = vi.fn()
  const fakeViewport = { scale: 1 }
  const dom = new JSDOM('<html></html>')
  beforeAll(() => {
    fakeAssign = vi.spyOn(WebSockets, 'locationAssign').mockImplementation((..._args: unknown[]) => undefined)
    mountDom(dom)
    global.window.visualViewport = cast<VisualViewport>(fakeViewport)
  })
  afterAll(() => {
    fakeAssign.mockRestore()
    unmountDom()
    vi.restoreAllMocks()
  })
  beforeEach(() => {
    fakeViewport.scale = 1
    fakeEmit.mockClear()
    fakeAssign.mockClear()
    dom.reconfigure({
      url: `http://127.0.0.1:2999/slideshow?`,
    })
  })
  it('should not break if socket is null', () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (1 / 6),
      clientY: global.window.innerHeight / 2,
    })
    Internals.handleClick(event, cast<WebSocket>(null), 1)
    assert(true, 'should not throw when null socket provided')
  })
  it('should not break if socket is undefined', () => {
    const event = new global.window.MouseEvent('click', {
      clientX: global.window.innerWidth * (1 / 6),
      clientY: global.window.innerHeight / 2,
    })
    Internals.handleClick(event, undefined, 1)
    assert(true, 'should not throw when undefined socket provided')
  })
  const emitCases: Array<[string, number, number, string]> = [
    ['', 0, 0, 'prev-image'],
    ['kiosk', 0, 0, 'prev-image'],
    ['', 0.1, 1, 'prev-image'],
    ['kiosk', 0.1, 1, 'prev-image'],
    ['', 0.2, 0.5, 'prev-image'],
    ['kiosk', 0.2, 0.5, 'prev-image'],
    ['', 0.3, 0.3, 'prev-image'],
    ['kiosk', 0.3, 0.3, 'prev-image'],
    ['', 0.32, 0.3, 'prev-image'],
    ['kiosk', 0.32, 0.3, 'prev-image'],
    ['', 0.33, 0.66, 'prev-image'],
    ['kiosk', 0.33, 0.3, 'prev-image'],
    ['', 0.34, 0.66, 'goto-image'],
    ['kiosk', 0.34, 0.3, 'next-image'],
    ['', 0.4, 0.66, 'goto-image'],
    ['kiosk', 0.4, 0.3, 'next-image'],
    ['', 0.5, 0.66, 'goto-image'],
    ['kiosk', 0.5, 0.3, 'next-image'],
    ['', 0.6, 0.66, 'goto-image'],
    ['kiosk', 0.6, 0.3, 'next-image'],
    ['', 0.66, 0.66, 'goto-image'],
    ['kiosk', 0.66, 0.3, 'next-image'],
    ['', 0.67, 0.66, 'next-image'],
    ['kiosk', 0.67, 0.3, 'next-image'],
    ['', 0.7, 0.66, 'next-image'],
    ['kiosk', 0.7, 0.3, 'next-image'],
    ['', 0.8, 0.66, 'next-image'],
    ['kiosk', 0.8, 0.3, 'next-image'],
    ['', 0.9, 0.66, 'next-image'],
    ['kiosk', 0.9, 0.3, 'next-image'],
    ['', 1, 0.66, 'next-image'],
    ['kiosk', 1, 0.3, 'next-image'],
  ]
  emitCases.forEach(([search, xPercent, yPercent, expected]) => {
    const doClick = (): void => {
      dom.reconfigure({
        url: `http://127.0.0.1:2999/slideshow?${search}`,
      })
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * xPercent,
        clientY: global.window.innerHeight * yPercent,
      })
      Internals.handleClick(event, fakeSocket, 1)
    }
    it(`should emit once when click is at ${xPercent} with search "${search}"`, () => {
      doClick()
      expect(fakeEmit.mock.calls.length).toBe(1)
    })
    it(`should emit ${expected} when click is at ${xPercent} with search "${search}"`, () => {
      doClick()
      expect(fakeEmit.mock.calls[0]?.[0]).toEqual(expected)
    })
    it(`should not ignore click at ${xPercent}:${yPercent} when zoomed in`, () => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * xPercent,
        clientY: global.window.innerHeight * yPercent,
      })
      Internals.handleClick(event, fakeSocket, 1.001)
      expect(fakeEmit.mock.calls.length).toBe(1)
    })
    it(`should ignore click at ${xPercent}:${yPercent} when zoomed out`, () => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * xPercent,
        clientY: global.window.innerHeight * yPercent,
      })
      Internals.handleClick(event, fakeSocket, 0.999)
      expect(fakeEmit.mock.calls.length).toBe(0)
    })
  })
  describe('when center-clicked for goto-image event', () => {
    beforeEach(() => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * 0.5,
        clientY: global.window.innerHeight * 0.5,
      })
      Internals.handleClick(event, fakeSocket, 1)
    })
    it('should emit second parameter for goto-image event', () => {
      expect(fakeEmit.mock.calls[0]).toHaveLength(2)
    })
    it('should provide callback function for goto-image event', () => {
      expect(fakeEmit.mock.calls[0]?.[1]).toBeInstanceOf(Function)
    })
  })
  describe('when visualViewport is null', () => {
    beforeEach(() => {
      global.window.visualViewport = null
    })
    afterEach(() => {
      global.window.visualViewport = cast<VisualViewport>(fakeViewport)
    })
    it('should still process click when visualViewport is null', () => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth,
        clientY: global.window.innerHeight / 2,
      })
      Internals.handleClick(event, fakeSocket, 1)
      expect(fakeEmit.mock.calls.length).toBe(1)
    })
    it('should emit next-image for right click when visualViewport is null', () => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth,
        clientY: global.window.innerHeight / 2,
      })
      Internals.handleClick(event, fakeSocket, 1)
      expect(fakeEmit.mock.calls[0]?.[0]).toBe('next-image')
    })
  })
  describe('when goto-image callback is invoked with null', () => {
    beforeEach(() => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * 0.5,
        clientY: global.window.innerHeight * 0.5,
      })
      Internals.handleClick(event, fakeSocket, 1)
      const fn = cast<(x: string | null) => void>(fakeEmit.mock.calls[0]?.[1])
      fn(null)
    })
    it('should not call location.assign from goto-image callback when folder is null', () => {
      expect(fakeAssign.mock.calls.length).toBe(0)
    })
  })
  describe('when goto-image callback is invoked', () => {
    beforeEach(() => {
      const event = new global.window.MouseEvent('click', {
        clientX: global.window.innerWidth * 0.5,
        clientY: global.window.innerHeight * 0.5,
      })
      Internals.handleClick(event, fakeSocket, 1)
      const fn = cast<(x: string) => void>(fakeEmit.mock.calls[0]?.[1])
      fn('/foo/bar/baz')
    })
    it('should call location.assign from goto-image callback', () => {
      expect(fakeAssign.mock.calls.length).toBe(1)
    })
    it('should assign expected uri from goto-image callback', () => {
      expect(fakeAssign.mock.calls[0]).toEqual(['/show/foo/bar/baz?noMenu'])
    })
  })
})
