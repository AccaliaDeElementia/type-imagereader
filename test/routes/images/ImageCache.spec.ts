'use sanity'

import { expect } from 'chai'
import { type CacheItem, ImageCache, ImageData } from '../../../routes/images'
import Sinon from 'sinon'

describe('routes/images class ImageData', () => {
  const defaultCacheSize = ImageCache.cacheSize
  let createSpy = Sinon.stub()
  let imageCache = new ImageCache(createSpy)
  beforeEach(() => {
    ImageCache.cacheSize = 5
    createSpy = Sinon.stub().resolves()
    imageCache = new ImageCache(createSpy)
  })
  after(() => {
    ImageCache.cacheSize = defaultCacheSize
  })
  describe('ctor', () => {
    it('should store cache item creation function', () => {
      const spy = Sinon.stub().resolves()
      const cache = new ImageCache(spy)
      expect(cache.cacheFunction).to.equal(spy)
    })
    it('should create cache with empty cache', () => {
      const cache = new ImageCache(Sinon.stub())
      expect(cache.items).to.have.lengthOf(0)
    })
  })
  describe('fetch()', () => {
    it('should fetch existing exact match item', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 50, 50)).to.equal(img)
    })
    it('should fetch existing match item with larger width', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 45, 50)).to.equal(img)
    })
    it('should not create new cache item with existing match', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 45, 50)).to.equal(img)
      expect(imageCache.items).to.have.lengthOf(1)
    })
    it('should not call cache item creator function with existing match', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 45, 50)).to.equal(img)
      expect(createSpy.callCount).to.equal(0)
    })
    it('should fetch existing match item with larger height', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 50, 45)).to.equal(img)
    })
    it('should fetch existing match item with larger width and height', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 45, 45)).to.equal(img)
    })
    it('should move existing item to head of the cache queue on retrieval', async () => {
      for (let i = 0; i < 10; i += 1) {
        imageCache.items.push({
          path: `/item_${i}.png`,
          width: 100 + i,
          height: 200 + i,
          image: Promise.resolve(ImageData.fromError('foo', 600, 'bar', `/item_${i}.png`)),
        })
      }
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      await imageCache.fetch('/foo.jpg', 45, 45)
      const extractPath = (i: CacheItem): string => i.path
      const paths = imageCache.items.map(extractPath)
      expect(paths).to.deep.equal([
        '/foo.jpg',
        '/item_0.png',
        '/item_1.png',
        '/item_2.png',
        '/item_3.png',
        '/item_4.png',
        '/item_5.png',
        '/item_6.png',
        '/item_7.png',
        '/item_8.png',
        '/item_9.png',
      ])
    })
    it('should create new cache item when query not found', async () => {
      await imageCache.fetch('/foo.jpg', 45, 45)
      expect(createSpy.callCount).to.equal(1)
    })
    it('should provide expected parameters to create function when entry not found', async () => {
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(createSpy.firstCall.args).to.deep.equal(['/foo.jpg', 45, 54])
    })
    it('should insert new cache item at beginning of queue', async () => {
      for (let i = 0; i < 10; i += 1) {
        imageCache.items.push({
          path: `/item_${i}.png`,
          width: 100 + i,
          height: 200 + i,
          image: Promise.resolve(ImageData.fromError('foo', 600, 'bar', `/item_${i}.png`)),
        })
      }
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      createSpy.resolves(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(imageCache.items[0]?.path).to.equal('/foo.jpg')
    })
    it('should store requested width in new cache item', async () => {
      for (let i = 0; i < 10; i += 1) {
        imageCache.items.push({
          path: `/item_${i}.png`,
          width: 100 + i,
          height: 200 + i,
          image: Promise.resolve(ImageData.fromError('foo', 600, 'bar', `/item_${i}.png`)),
        })
      }
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      createSpy.resolves(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(imageCache.items[0]?.width).to.equal(45)
    })
    it('should store requested height in new cache item', async () => {
      for (let i = 0; i < 10; i += 1) {
        imageCache.items.push({
          path: `/item_${i}.png`,
          width: 100 + i,
          height: 200 + i,
          image: Promise.resolve(ImageData.fromError('foo', 600, 'bar', `/item_${i}.png`)),
        })
      }
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      createSpy.resolves(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(imageCache.items[0]?.height).to.equal(54)
    })
    it('should store promise resolving to requested image in new cache item', async () => {
      for (let i = 0; i < 10; i += 1) {
        imageCache.items.push({
          path: `/item_${i}.png`,
          width: 100 + i,
          height: 200 + i,
          image: Promise.resolve(ImageData.fromError('foo', 600, 'bar', `/item_${i}.png`)),
        })
      }
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      createSpy.resolves(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      const result = await imageCache.items[0]?.image
      expect(result).to.equal(img)
    })
    it('should prune older unused cache items when cache is full and new item is added', async () => {
      for (let i = 0; i < 10; i += 1) {
        imageCache.items.push({
          path: `/item_${i}.png`,
          width: 100 + i,
          height: 200 + i,
          image: Promise.resolve(ImageData.fromError('foo', 600, 'bar', `/item_${i}.png`)),
        })
      }
      await imageCache.fetch('/foo.jpg', 45, 45)
      const extractPath = (i: CacheItem): string => i.path
      const paths = imageCache.items.map(extractPath)
      expect(paths).to.deep.equal(['/foo.jpg', '/item_0.png', '/item_1.png', '/item_2.png', '/item_3.png'])
    })
  })
})
