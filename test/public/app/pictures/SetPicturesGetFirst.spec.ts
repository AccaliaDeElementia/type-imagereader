'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { Cast } from '../../../testutils/TypeGuards'
import { render } from 'pug'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import type { Picture } from '../../../../contracts/listing'

const markup = `
html
  body
    div#tabImages
    div#ImageLink
      a(href="#tabImages") Pictures
`

describe('public/app/pictures function SetPicturesGetFirst()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})

  let element: HTMLElement | null = null
  const menuShow = Sinon.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    PubSub.subscribers = {
      'MENU:SHOW': [menuShow],
    }
    PubSub.deferred = []
    Pictures.mainImage = dom.window.document.createElement('img')
    element = dom.window.document.querySelector('div#ImageLink')
    Pictures.pictures = []
    Pictures.modCount = -65535
  })
  afterEach(() => {
    menuShow.resetHistory()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should abort gracefully for null mainImage', () => {
    Pictures.mainImage = null
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.modCount).to.equal(-65535)
  })
  it('should return null for null mainImage', () => {
    Pictures.mainImage = null
    const result = Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(result).to.equal(null)
  })
  it('should hide mainImage when listing has null pictures', () => {
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(true)
  })
  it('should hide image tab link when listing has null pictures', () => {
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(element?.classList.contains('hidden')).to.equal(true)
  })
  it('should publish MenuShow when listing has null pictures', () => {
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(menuShow.callCount).to.equal(1)
  })
  it('should hide mainImage when listing has null pictures', () => {
    const result = Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(result).to.equal(null)
  })
  it('should ignore incoming modCount when listing has null pictures', () => {
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      modCount: 42,
    })
    expect(Pictures.modCount).to.equal(-65535)
  })
  it('should hide mainImage when listing has empty pictures', () => {
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(Pictures.mainImage?.classList.contains('hidden')).to.equal(true)
  })
  it('should hide image tab link when listing has empty pictures', () => {
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(element?.classList.contains('hidden')).to.equal(true)
  })
  it('should publish MenuShow when listing has empty pictures', () => {
    Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(menuShow.callCount).to.equal(1)
  })
  it('should hide mainImage when listing has empty pictures', () => {
    const result = Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: [],
      modCount: 42,
    })
    expect(result).to.equal(null)
  })
  it('should ignore incoming modCount when listing has empty pictures', () => {
    Pictures.SetPicturesGetFirst({
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
    Pictures.SetPicturesGetFirst({
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
    Pictures.SetPicturesGetFirst({
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
    Pictures.SetPicturesGetFirst({
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
    Pictures.SetPicturesGetFirst({
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
    Pictures.SetPicturesGetFirst({
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
    Pictures.SetPicturesGetFirst({
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
    const res = Pictures.SetPicturesGetFirst({
      name: '',
      path: '',
      parent: '',
      pictures: pics,
      modCount: 42,
    })
    expect(res).to.equal(pics[0])
  })
})
