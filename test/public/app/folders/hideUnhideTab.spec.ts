'use sanity'

import { expect } from 'chai'
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

  describe('HideTab()', () => {
    it('should add hidden class to parent of selected element', () => {
      Internals.HideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).to.equal(true)
    })
    it('should retain hidden class on hidden parent of selected element', () => {
      tabFolders?.classList.add('hidden')
      Internals.HideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).to.equal(true)
    })
    it('should not throw when selecting non existing element', () => {
      expect(() => {
        Internals.HideTab('span[href="#THISISNOTALINK"]')
      }).to.not.throw()
    })
  })

  describe('UnhideTab()', () => {
    it('should remove hidden class from parent of selected element', () => {
      tabFolders?.classList.add('hidden')
      Internals.UnhideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).to.equal(false)
    })
    it('should noop on visible parent of selected element', () => {
      tabFolders?.classList.remove('hidden')
      Internals.UnhideTab('a[href="#tabFolders"]')
      expect(tabFolders?.classList.contains('hidden')).to.equal(false)
    })
    it('should not throw when selecting non existing element', () => {
      expect(() => {
        Internals.UnhideTab('span[href="#THISISNOTALINK"]')
      }).to.not.throw()
    })
  })
})
