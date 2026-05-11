'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals, Navigation } from '#public/scripts/app/navigation.js'
describe('public/app/navigation isSuppressMenu()', () => {
  let dom = new JSDOM('', {})
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    Navigation.current = {
      name: '',
      path: '',
      parent: '',
    }
  })
  afterEach(() => {
    unmountDom()
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
      expect(Internals.isSuppressMenu()).toBe(expected)
    })
  })
})
