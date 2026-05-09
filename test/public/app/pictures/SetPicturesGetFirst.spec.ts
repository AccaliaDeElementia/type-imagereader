'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/Dom.js'
import { Pictures } from '#public/scripts/app/pictures/index.js'
import { Internals } from '#public/scripts/app/pictures/data.js'
import { render } from 'pug'
import { PubSub } from '#public/scripts/app/pubsub.js'
import type { Picture } from '#contracts/listing.js'
import { resetPubSub } from '#testutils/PubSub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#tabImages
    div#ImageLink
      a(href="#tabImages") Pictures
`

describe('public/app/pictures SetPicturesGetFirst()', () => {
  let dom = new JSDOM('<html></html>', {})

  let element: HTMLElement | null = null
  const menuShow = sandbox.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    resetPubSub()
    PubSub.subscribers = {
      'MENU:SHOW': [menuShow],
    }
    Pictures.mainImage = dom.window.document.createElement('img')
    element = dom.window.document.querySelector('div#ImageLink')
    Pictures.pictures = []
    Pictures.modCount = -65535
  })
  afterEach(() => {
    sandbox.restore()
    menuShow.resetHistory()
    unmountDom()
  })
  it('should abort gracefully for null mainImage', () => {
    Pictures.mainImage = null
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.modCount).to.equal(-65535)
  })
  it('should return null for null mainImage', () => {
    Pictures.mainImage = null
    const result = Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(result).to.equal(null)
  })
  it('should hide mainImage when listing has null pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(true)
  })
  it('should hide image tab link when listing has null pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(element?.classList.contains('hidden')).to.equal(true)
  })
  it('should publish MenuShow when listing has null pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(menuShow.callCount).to.equal(1)
  })
  it('should hide mainImage when listing has null pictures', () => {
    const result = Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(result).to.equal(null)
  })
  it('should ignore incoming modCount when listing has null pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.modCount).to.equal(-65535)
  })
  it('should hide mainImage when listing has empty pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(true)
  })
  it('should hide image tab link when listing has empty pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(element?.classList.contains('hidden')).to.equal(true)
  })
  it('should publish MenuShow when listing has empty pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(menuShow.callCount).to.equal(1)
  })
  it('should hide mainImage when listing has empty pictures', () => {
    const result = Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(result).to.equal(null)
  })
  it('should ignore incoming modCount when listing has empty pictures', () => {
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(Pictures.modCount).to.equal(-65535)
  })
  it('should unhide mainImage when listing has pictures', () => {
    Pictures.mainImage?.classList.add('hidden')
    Internals.SetPicturesGetFirst({
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
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(false)
  })
  it('should unhide images tab link when listing has pictures', () => {
    element?.classList.add('hidden')
    Internals.SetPicturesGetFirst({
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
    expect(element?.classList.contains('hidden')).to.equal(false)
  })
  it('should save pictures when listing has pictures', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    expect(Pictures.pictures).to.equal(pics)
  })
  it('should set index for all pictures when listing has pictures', () => {
    const pics: Picture[] = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    pics.forEach((pic, idx) => {
      expect(pic.index).to.equal(idx)
    })
  })
  it('should set saved modCount when listing has pictures', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    expect(Pictures.modCount).to.equal(42)
  })
  it('should set default modCount when listing has missing modCount', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
    })
    expect(Pictures.modCount).to.equal(-1)
  })
  it('should return first pciture when listing has pictures', () => {
    const pics = Array.from({ length: 17 }).map((_, i) => ({
      name: `foo ${i}.gif`,
      path: `/foo ${i}.gif`,
      seen: false,
    }))
    element?.classList.add('hidden')
    const res = Internals.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    expect(res).to.equal(pics[0])
  })
})
