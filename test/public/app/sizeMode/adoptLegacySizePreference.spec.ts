'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/sizeMode.js'

describe('public/app/sizeMode adoptLegacySizePreference()', () => {
  let dom = new JSDOM('<html></html>')
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should adopt actualSize from a legacy original size preference', () => {
    dom.window.localStorage.setItem('ShowOriginalSize', 'true')
    Internals.adoptLegacySizePreference()
    expect(dom.window.localStorage.getItem('SizeMode')).toBe('actualSize')
  })
  it('should adopt fitScreen from a legacy scaled size preference', () => {
    dom.window.localStorage.setItem('ShowOriginalSize', 'false')
    Internals.adoptLegacySizePreference()
    expect(dom.window.localStorage.getItem('SizeMode')).toBe('fitScreen')
  })
  it('should discard the legacy key so it cannot be adopted a second time', () => {
    dom.window.localStorage.setItem('ShowOriginalSize', 'true')
    Internals.adoptLegacySizePreference()
    expect(dom.window.localStorage.getItem('ShowOriginalSize')).toBe(null)
  })
  it('should not overwrite a mode the reader has already chosen', () => {
    dom.window.localStorage.setItem('SizeMode', 'fitWidth')
    dom.window.localStorage.setItem('ShowOriginalSize', 'true')
    Internals.adoptLegacySizePreference()
    expect(dom.window.localStorage.getItem('SizeMode')).toBe('fitWidth')
  })
  it('should still discard the legacy key when a mode is already chosen', () => {
    dom.window.localStorage.setItem('SizeMode', 'fitWidth')
    dom.window.localStorage.setItem('ShowOriginalSize', 'true')
    Internals.adoptLegacySizePreference()
    expect(dom.window.localStorage.getItem('ShowOriginalSize')).toBe(null)
  })
  it('should replace an unrecognised stored mode', () => {
    dom.window.localStorage.setItem('SizeMode', 'enhance')
    dom.window.localStorage.setItem('ShowOriginalSize', 'true')
    Internals.adoptLegacySizePreference()
    expect(dom.window.localStorage.getItem('SizeMode')).toBe('actualSize')
  })
  it('should store nothing when there is no legacy preference', () => {
    Internals.adoptLegacySizePreference()
    expect(dom.window.localStorage.getItem('SizeMode')).toBe(null)
  })
})
