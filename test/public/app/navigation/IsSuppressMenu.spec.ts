'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'
describe('public/app/navigation function IsSuppressMenu()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    Navigation.current = {
      name: '',
      path: '',
      parent: '',
    }
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  const testCases: Array<[string, boolean]> = [
    ['http://127.0.0.1:2999', false],
    ['http://127.0.0.1:2999/noMenu', false],
    ['http://127.0.0.1:2999?no=menu', false],
    ['http://127.0.0.1:2999?nomenu', false],
    ['http://127.0.0.1:2999?xavier=noMenu', false],
    ['http://127.0.0.1:2999?noMenu', true],
    ['http://127.0.0.1:2999?noMenu=true', true],
    ['http://127.0.0.1:2999?noMenu=false', true],
    ['http://127.0.0.1:2999?noMenu=fred', true],
  ]
  testCases.forEach(([url, expected]) => {
    it(`should be${expected ? '' : ' not'} suppress menu for url: ${url}`, () => {
      dom.reconfigure({ url })
      expect(Navigation.IsSuppressMenu()).to.equal(expected)
    })
  })
})
