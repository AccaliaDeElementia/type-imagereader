'use sanity'

import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictures/state.js'
import { Imports, Internals } from '#public/scripts/app/pictures/data.js'
import { render } from 'pug'
import type { Picture } from '#contracts/listing.js'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
    div#ImageLink
      a(href="#tabImages") Pictures
`

describe('public/app/pictures setPicturesGetFirst()', () => {
  let dom = new JSDOM('<html></html>', {})

  let element: HTMLElement | null = null
  let publishStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    resetPubSub()
    publishStub = sandbox.stub(Imports, 'publish')
    Pictures.mainImage = dom.window.document.createElement('img')
    element = dom.window.document.querySelector('div#ImageLink')
    Pictures.pictures = []
    Pictures.modCount = -65535
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should abort gracefully for null mainImage', () => {
    Pictures.mainImage = null
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.modCount).toBe(-65535)
  })
  it('should return null for null mainImage', () => {
    Pictures.mainImage = null
    const result = Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(result).toBe(null)
  })
  it('should hide mainImage when listing has null pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.mainImage?.classList.contains('hidden')).toBe(true)
  })
  it('should hide image tab link when listing has null pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(element?.classList.contains('hidden')).toBe(true)
  })
  it('should publish MenuShow when listing has null pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(1)
  })
  it('should hide mainImage when listing has null pictures', () => {
    const result = Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(result).toBe(null)
  })
  it('should ignore incoming modCount when listing has null pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.modCount).toBe(-65535)
  })
  it('should hide mainImage when listing has empty pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(Pictures.mainImage?.classList.contains('hidden')).toBe(true)
  })
  it('should hide image tab link when listing has empty pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(element?.classList.contains('hidden')).toBe(true)
  })
  it('should publish MenuShow when listing has empty pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(publishStub.withArgs('Menu:show').callCount).toBe(1)
  })
  it('should hide mainImage when listing has empty pictures', () => {
    const result = Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(result).toBe(null)
  })
  it('should ignore incoming modCount when listing has empty pictures', () => {
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(Pictures.modCount).toBe(-65535)
  })
  it('should unhide mainImage when listing has pictures', () => {
    Pictures.mainImage?.classList.add('hidden')
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [
        {
          name: 'foo',
          path: '/foo',
          seen: false,
        },
      ],
      modCount: 42,
    })
    expect(Pictures.mainImage?.classList.contains('hidden')).toBe(false)
  })
  it('should unhide images tab link when listing has pictures', () => {
    element?.classList.add('hidden')
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [
        {
          name: 'foo',
          path: '/foo',
          seen: false,
        },
      ],
      modCount: 42,
    })
    expect(element?.classList.contains('hidden')).toBe(false)
  })
  it('should save pictures when listing has pictures', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    expect(Pictures.pictures).toBe(pics)
  })
  it('should set index for all pictures when listing has pictures', () => {
    const pics: Picture[] = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    pics.forEach((pic, idx) => {
      expect(pic.index).toBe(idx)
    })
  })
  it('should set saved modCount when listing has pictures', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    expect(Pictures.modCount).toBe(42)
  })
  it('should set default modCount when listing has missing modCount', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
    })
    expect(Pictures.modCount).toBe(-1)
  })
  it('should return first pciture when listing has pictures', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    const res = Internals.setPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    expect(res).toBe(pics[0])
  })
})
