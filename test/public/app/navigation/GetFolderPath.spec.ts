'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'
describe('public/app/navigation function GetFolderPath()', () => {
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
      expect(Navigation.GetFolderPath()).to.equal(expected)
    })
  })
})
