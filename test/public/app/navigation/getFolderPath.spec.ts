'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/navigation.js'
describe('public/app/navigation getFolderPath()', () => {
  let dom = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM('', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
  })
  afterEach(() => {
    unmountDom()
  })
  const testCases: Array<[string, string]> = [
    ['http://type-imagereader.example.com', '/'],
    ['http://type-imagereader.example.com/', '/'],
    ['http://type-imagereader.example.com/show', '/'],
    ['http://type-imagereader.example.com/show/', '/'],
    ['http://type-imagereader.example.com/florglebluster', '/'],
    ['http://type-imagereader.example.com/florglebluster/', '/'],
    ['http://type-imagereader.example.com/show/foo', '/foo'],
    ['http://type-imagereader.example.com/show/foo/bar/baz/quuuux', '/foo/bar/baz/quuuux'],
    ['http://type-imagereader.example.com/show/foo?noMenu', '/foo'],
  ]
  testCases.forEach(([url, expected]) => {
    it(`should return expected path for url: ${url}`, () => {
      dom.reconfigure({ url })
      expect(Internals.getFolderPath()).to.equal(expected)
    })
  })
})
