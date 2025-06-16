'use sanity'

import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'

import { Folders } from '../../../../public/scripts/app/folders'

const markup = `
html
  body
      div#tabLink
        a(href="#tabFolders") Folders
`

describe('public/app/folders function HideTab()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let tabFolders: HTMLDivElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    tabFolders = dom.window.document.querySelector('#tabLink')
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should add hidden class to parent of selected element', () => {
    Folders.HideTab('a[href="#tabFolders"]')
    expect(tabFolders?.classList.contains('hidden')).to.equal(true)
  })
  it('should retain hidden class on hidden parent of selected element', () => {
    tabFolders?.classList.add('hidden')
    Folders.HideTab('a[href="#tabFolders"]')
    expect(tabFolders?.classList.contains('hidden')).to.equal(true)
  })
  it('should not throw when selecting non existing element', () => {
    expect(() => {
      Folders.HideTab('span[href="#THISISNOTALINK"]')
    }).to.not.throw()
  })
})
describe('public/app/folders function UnhideTab()', () => {
  const existingWindow: Window & typeof globalThis = global.window
  const existingDocument: Document = global.document
  let dom: JSDOM = new JSDOM('', {})
  let tabFolders: HTMLDivElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    tabFolders = dom.window.document.querySelector('#tabLink')
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should remove hidden class to parent of selected element', () => {
    tabFolders?.classList.add('hidden')
    Folders.UnhideTab('a[href="#tabFolders"]')
    expect(tabFolders?.classList.contains('hidden')).to.equal(false)
  })
  it('should noop on visible parent of selected element', () => {
    tabFolders?.classList.remove('hidden')
    Folders.UnhideTab('a[href="#tabFolders"]')
    expect(tabFolders?.classList.contains('hidden')).to.equal(false)
  })
  it('should not throw when selecting non existing element', () => {
    expect(() => {
      Folders.UnhideTab('span[href="#THISISNOTALINK"]')
    }).to.not.throw()
  })
})
