'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { Internals } from '#public/scripts/app/navigation.js'
describe('public/app/navigation GetBaseUrl()', () => {
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
    ['http://type-imagereader.example.com', 'http://type-imagereader.example.com/'],
    ['https://type-imagereader.example.com:2999', 'https://type-imagereader.example.com:2999/'],
    ['https://type-imagereader.example.com', 'https://type-imagereader.example.com/'],
    ['https://type-imagereader.example.com/?quux', 'https://type-imagereader.example.com/'],
    ['https://type-imagereader.example.com/florgle/foo/bar/baz?quux', 'https://type-imagereader.example.com/florgle'],
    ['https://type-imagereader.example.com/show/foo/bar/baz?quux', 'https://type-imagereader.example.com/show'],
  ]
  testCases.forEach(([url, expected]) => {
    it(`should return expected output for url: ${url}`, () => {
      dom.reconfigure({ url })
      expect(Internals.GetBaseUrl()).to.equal(expected)
    })
  })
})
