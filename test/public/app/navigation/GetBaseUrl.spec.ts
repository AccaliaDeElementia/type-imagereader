'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'
describe('public/app/navigation function GetBaseUrl()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM('', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
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
      expect(Navigation.GetBaseUrl()).to.equal(expected)
    })
  })
})
