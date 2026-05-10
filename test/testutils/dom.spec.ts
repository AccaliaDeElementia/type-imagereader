'use sanity'

import { JSDOM } from 'jsdom'

import { mountDom, unmountDom } from '#testutils/dom.js'

describe('testutils mountDom()', () => {
  afterEach(() => {
    unmountDom()
  })
  it('should return the dom that was passed in', () => {
    const dom = new JSDOM('<html><body></body></html>')
    expect(mountDom(dom)).toBe(dom)
  })
  it('should install dom.window as global.window', () => {
    const dom = new JSDOM('<html><body></body></html>')
    mountDom(dom)
    expect(global.window).toBe(dom.window)
  })
  it('should install dom.window.document as global.document', () => {
    const dom = new JSDOM('<html><body><div id="x"></div></body></html>')
    mountDom(dom)
    expect(global.document).toBe(dom.window.document)
  })
  it('should make global.document.querySelector reachable after mount', () => {
    const dom = new JSDOM('<html><body><div id="x"></div></body></html>')
    mountDom(dom)
    expect(global.document.querySelector('#x')).not.toBe(null)
  })
})

describe('testutils unmountDom()', () => {
  it('should restore global.window after a mount cycle', () => {
    const before = global.window
    mountDom(new JSDOM('<html></html>'))
    unmountDom()
    expect(global.window).toBe(before)
  })
  it('should restore global.document after a mount cycle', () => {
    const before = global.document
    mountDom(new JSDOM('<html></html>'))
    unmountDom()
    expect(global.document).toBe(before)
  })
  it('should be safe to call multiple times in a row', () => {
    mountDom(new JSDOM('<html></html>'))
    unmountDom()
    expect(() => {
      unmountDom()
    }).not.toThrow()
  })
})
