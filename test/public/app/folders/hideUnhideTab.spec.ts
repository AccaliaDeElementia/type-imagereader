'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { Internals } from '#public/scripts/app/folders.js'

const markup = `
html
  body
      div#tabLink
        a(href="#tabFolders") Folders
`

describe('public/app/folders tab visibility', () => {
  let dom: JSDOM = new JSDOM('', {})
  let tabFolders: HTMLDivElement | null = null
  beforeEach(() => {
    dom = mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))
    tabFolders = dom.window.document.querySelector('#tabLink')
  })
  afterEach(() => {
    unmountDom()
  })

  describe('hideTab()', () => {
    it('should add hidden class to parent of selected element', () => {
      Internals.hideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).toBe(true)
    })
    it('should retain hidden class on hidden parent of selected element', () => {
      tabFolders?.classList.add('hidden')
      Internals.hideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).toBe(true)
    })
    it('should not throw when selecting non existing element', () => {
      expect(() => {
        Internals.hideTab('span[href="#THISISNOTALINK"]')
      }).not.toThrow()
    })
  })

  describe('unhideTab()', () => {
    it('should remove hidden class from parent of selected element', () => {
      tabFolders?.classList.add('hidden')
      Internals.unhideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).toBe(false)
    })
    it('should noop on visible parent of selected element', () => {
      tabFolders?.classList.remove('hidden')
      Internals.unhideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).toBe(false)
    })
    it('should not throw when selecting non existing element', () => {
      expect(() => {
        Internals.unhideTab('span[href="#THISISNOTALINK"]')
      }).not.toThrow()
    })
  })
})
