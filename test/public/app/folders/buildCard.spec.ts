'use sanity'

import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { resetPubSub } from '#testutils/pubsub.js'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { Folders, Internals } from '#public/scripts/app/folders.js'
import assert from 'node:assert'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

const markup = `
html
  head
    title
  body
    div
      a.navbar-brand
      a.menuButton
    div#mainMenu
      div#tabLink
        a(href="#tabFolders") Folders
      div#tabFolders
    template#folderCard
      div.card
        div.card-top
          i.material-icons folder
        div.card-body
          h5 placeholder
        div.progress
          div.text placeholder%
          div.slider(style="width: 0")
`

describe('public/app/folders buildCard()', () => {
  let dom: JSDOM = new JSDOM('', {})
  let folderCard: DocumentFragment | null = null
  beforeEach(() => {
    dom = mountDom(new JSDOM(render(markup), { url: 'http://127.0.0.1:2999' }))

    resetPubSub()
    Folders.folderCard = null
    const template = document.querySelector<HTMLTemplateElement>('#folderCard')
    assert(template !== null)
    folderCard = template.content
    Folders.folderCard = folderCard
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should return null when template is missing', () => {
    Folders.folderCard = null
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 0,
    })
    expect(result).toBe(null)
  })
  it('should return null when template is empty', () => {
    for (const child of folderCard?.children ?? []) {
      child.remove()
    }
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 0,
    })
    expect(result).toBe(null)
  })
  it('should not remove emoji icon when cover image is null', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: null,
      totalCount: 100,
      seenCount: 0,
    })
    expect(result?.querySelector('i.material-icons') ?? null).not.toBe(null)
  })
  it('should preserve emoji icon content when cover image is null', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: null,
      totalCount: 100,
      seenCount: 0,
    })
    expect(result?.querySelector('i.material-icons')?.innerHTML).toBe('folder')
  })
  it('should not remove emoji icon when cover image is empty', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '',
      totalCount: 100,
      seenCount: 0,
    })
    expect(result?.querySelector('i.material-icons') ?? null).not.toBe(null)
  })
  it('should preserve emoji icon content when cover image is empty', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '',
      totalCount: 100,
      seenCount: 0,
    })
    expect(result?.querySelector('i.material-icons')?.innerHTML).toBe('folder')
  })
  it('should remove emoji cover when cover image is set', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 0,
    })
    const icon = result?.querySelector('i.material-icons') ?? null
    expect(icon).toBe(null)
  })
  it('should set card backgroundImage when cover image is set', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 0,
    })
    expect(result?.style.backgroundImage).toBe('url("/images/preview/path/foo/cover.png-image.webp")')
  })
  it('should not set seen flag when read count iz zero', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 0,
    })
    expect(result?.classList.contains('seen')).toBe(false)
  })
  it('should not set seen flag when read count less than total count', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 50,
    })
    expect(result?.classList.contains('seen')).toBe(false)
  })
  it('should set seen flag when read count equals total count', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 100,
    })
    expect(result?.classList.contains('seen')).toBe(true)
  })
  it('should set seen flag when read count exceeds total count', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 101,
    })
    expect(result?.classList.contains('seen')).toBe(true)
  })
  it('should set folder name header', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 101,
    })
    expect(result?.querySelector('h5')?.innerText).toBe('foo')
  })
  it('should gracefully decline to set folder name header when missing', () => {
    folderCard?.querySelector('h5')?.remove()
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 10,
    })
    expect(result?.querySelector('h5')).toBe(null)
  })
  it('should set folder progress text', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 42,
    })
    expect(result?.querySelector<HTMLDivElement>('div.text')?.innerText).toBe('42/100')
  })
  it('should gracefully decline to set folder progress text when missing', () => {
    folderCard?.querySelector('div.text')?.remove()
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 101,
    })
    expect(result?.querySelector('div.text')).toBe(null)
  })
  it('should set folder slider width', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 10000,
      seenCount: 666,
    })
    expect(result?.querySelector<HTMLDivElement>('div.slider')?.style.width).toBe('6.66%')
  })
  it('should set folder slider width to 100% when total count is zero', () => {
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 0,
      seenCount: 0,
    })
    expect(result?.querySelector<HTMLDivElement>('div.slider')?.style.width).toBe('100%')
  })
  it('should gracefully decline to set folder slider width when missing', () => {
    folderCard?.querySelector('div.slider')?.remove()
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 101,
    })
    expect(result?.querySelector('div.slider')).toBe(null)
  })
  it('should navigate on click', () => {
    const evt = new dom.window.MouseEvent('click')
    const result = Internals.buildCard({
      name: 'foo',
      path: '/path/foo',
      cover: '/path/foo/cover.png',
      totalCount: 100,
      seenCount: 101,
    })
    const spy = sandbox.stub().resolves()
    PubSub.subscribers['NAVIGATE:LOAD'] = [spy]
    assert(result !== null, 'result is required for valid test')
    result.dispatchEvent(evt)
    expect(spy.calledWith('/path/foo')).toBe(true)
  })
})
