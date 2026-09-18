'use sanity'

import { Internals, type WebSocket } from '#public/scripts/slideshow/sockets.js'
import { cast } from '#testutils/typeGuards.js'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
describe('public/slideshow/sockets handleKeys()', () => {
  const fakeEmit = vi.fn()
  const fakeSocket = cast<WebSocket>({ emit: fakeEmit })
  const dom = new JSDOM('<html></html>')
  beforeAll(() => {
    mountDom(dom)
  })
  afterAll(() => {
    unmountDom()
  })
  beforeEach(() => {
    fakeEmit.mockClear()
  })
  const missingSockets: Array<[string, WebSocket | undefined]> = [
    ['null', cast<WebSocket>(null)],
    ['undefined', undefined],
  ]
  it.each(missingSockets)('should not throw on an emitting key when the socket is %s', (_title, socket) => {
    const evt = new global.window.KeyboardEvent('keyup', { key: 'arrowright' })
    expect(() => {
      Internals.handleKeys(evt, socket)
    }).not.toThrow()
  })
  const ignoredKeys = ['a', 'A', 'ARROW', 'Left', 'right', 'f1', 'F23, ENTER']
  ignoredKeys.forEach((key) => {
    it(`should not emit when key is '${key}'`, () => {
      const evt = new global.window.KeyboardEvent('keyup', { key })
      Internals.handleKeys(evt, fakeSocket)
      expect(fakeEmit.mock.calls.length).toBe(0)
    })
  })
  const triggerKeys: Array<[string, string]> = [
    ['arrowright', 'next-image'],
    ['ARROWRIGHT', 'next-image'],
    ['aRrOwRiGhT', 'next-image'],
    ['ArRoWrIgHt', 'next-image'],
    ['arrowleft', 'prev-image'],
    ['ARROWLEFT', 'prev-image'],
    ['ArRoWlEfT', 'prev-image'],
    ['aRrOwLeFt', 'prev-image'],
  ]
  triggerKeys.forEach(([key, expected]) => {
    it(`should emit only once for key: ${key}`, () => {
      const evt = new global.window.KeyboardEvent('keyup', { key })
      Internals.handleKeys(evt, fakeSocket)
      expect(fakeEmit.mock.calls.length).toBe(1)
    })
    it(`should emit '${expected}' for key: ${key}`, () => {
      const evt = new global.window.KeyboardEvent('keyup', { key })
      Internals.handleKeys(evt, fakeSocket)
      expect(fakeEmit.mock.calls[0]).toEqual([expected])
    })
  })
})
