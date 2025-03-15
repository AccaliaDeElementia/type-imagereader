'use sanity'

import { Functions } from '../../../../public/scripts/slideshow/sockets'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { Cast } from '../../../testutils/TypeGuards'
import { render } from 'pug'
import { JSDOM } from 'jsdom'
import { expect } from 'chai'

const markup = `
html
  body
    img.mainImage.topImage
    img.mainImage.bottomImage.blur
    img.mainImage.bottomImage
`

describe('public/slideshow/sockets DoNewImage()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>')
  let topImage: HTMLImageElement | null = null
  let bottomImage: HTMLImageElement | null = null
  let bottomBlurImage: HTMLImageElement | null = null
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    topImage = dom.window.document.querySelector<HTMLImageElement>('img.topImage')
    bottomImage = dom.window.document.querySelector<HTMLImageElement>('img.bottomImage:not(.blur)')
    bottomBlurImage = dom.window.document.querySelector<HTMLImageElement>('img.bottomImage.blur')
    global.window = Cast<Window & typeof globalThis>(dom.window)
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => dom.window.document,
    })
  })
  afterEach(() => {
    global.window = existingWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => existingDocument,
    })
  })
  const staticImages: string[] = [
    '/some/image.bmp',
    '/some/image.BMP',
    '/some/image.jpg',
    '/some/image.JPG',
    '/some/image.jpe',
    '/some/image.JPE',
    '/some/image.jpeg',
    '/some/image.JPEG',
    '/some/image.png',
    '/some/image.PNG',
    '/some/image.webm',
    '/some/image.WEBM',
    '/some/image.txt',
    '/some/image.TXT',
    '/some/image.florgle',
    '/some/image.FLORGLE',
    '/some/image.notgif',
    '/some/image.notGIF',
    '/some/image.NOTGIF',
  ]
  staticImages.forEach((img) => {
    it(`should unhide .topImage for image: ${img}`, () => {
      topImage?.classList.add('hide')
      Functions.DoNewImage(img)
      expect(topImage?.classList.contains('hide')).to.equal(false)
    })
    it(`should set source .topImage for image: ${img}`, () => {
      topImage?.setAttribute('src', 'Invalid!')
      Functions.DoNewImage(img)
      expect(topImage?.getAttribute('src')).to.equal(`/images/kiosk${img}-image.webp`)
    })
    it(`should unhide .bottomImage for image: ${img}`, () => {
      bottomImage?.classList.add('hide')
      Functions.DoNewImage(img)
      expect(bottomImage?.classList.contains('hide')).to.equal(false)
    })
    it(`should set source .bottomImage for image: ${img}`, () => {
      bottomImage?.setAttribute('src', 'Invalid!')
      Functions.DoNewImage(img)
      expect(bottomImage?.getAttribute('src')).to.equal(`/images/kiosk${img}-image.webp`)
    })
    it(`should unhide .bottomImage.blur for image: ${img}`, () => {
      bottomBlurImage?.classList.add('hide')
      Functions.DoNewImage(img)
      expect(bottomBlurImage?.classList.contains('hide')).to.equal(false)
    })
    it(`should set source .bottomImage.blur for image: ${img}`, () => {
      bottomBlurImage?.setAttribute('src', 'Invalid!')
      Functions.DoNewImage(img)
      expect(bottomBlurImage?.getAttribute('src')).to.equal(`/images/kiosk${img}-image.webp`)
    })
  })
  const animatedImages: string[] = ['/some/image.gif', '/some/image.GIF', '/some/image.GiF', '/some/image.gIf']
  animatedImages.forEach((img) => {
    it(`should unhide .topImage for image: ${img}`, () => {
      topImage?.classList.add('hide')
      Functions.DoNewImage(img)
      expect(topImage?.classList.contains('hide')).to.equal(false)
    })
    it(`should set source .topImage for image: ${img}`, () => {
      topImage?.setAttribute('src', 'Invalid!')
      Functions.DoNewImage(img)
      expect(topImage?.getAttribute('src')).to.equal(`/images/kiosk${img}-image.webp`)
    })
    it(`should hide .bottomImage for image: ${img}`, () => {
      bottomImage?.classList.add('hide')
      Functions.DoNewImage(img)
      expect(bottomImage?.classList.contains('hide')).to.equal(true)
    })
    it(`should clear source .bottomImage for image: ${img}`, () => {
      bottomImage?.setAttribute('src', 'Invalid!')
      Functions.DoNewImage(img)
      expect(bottomImage?.getAttribute('src')).to.equal(null)
    })
    it(`should hide .bottomImage.blur for image: ${img}`, () => {
      bottomBlurImage?.classList.add('hide')
      Functions.DoNewImage(img)
      expect(bottomBlurImage?.classList.contains('hide')).to.equal(true)
    })
    it(`should clear source .bottomImage.blur for image: ${img}`, () => {
      bottomBlurImage?.setAttribute('src', 'Invalid!')
      Functions.DoNewImage(img)
      expect(bottomBlurImage?.getAttribute('src')).to.equal(null)
    })
  })
})
