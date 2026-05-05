'use sanity'

import { expect } from 'chai'
import { type CacheItem, ImageCache, ImageData } from '#routes/images.js'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

describe('routes/images class ImageData', () => {
  const defaultCacheSize = ImageCache.cacheSize
  let createSpy = sandbox.stub()
  let imageCache = new ImageCache(createSpy)
  beforeEach(() => {
    ImageCache.cacheSize = 5
    createSpy = sandbox.stub().resolves(ImageData.fromImage(Buffer.from(''), '', ''))
    imageCache = new ImageCache(createSpy)
  })
  afterEach(() => {
    sandbox.restore()
  })
  after(() => {
    ImageCache.cacheSize = defaultCacheSize
  })
  describe('ctor', () => {
    it('should store cache item creation function', () => {
      const spy = sandbox.stub().resolves()
      const cache = new ImageCache(spy)
      expect(cache.cacheFunction).to.equal(spy)
    })
    it('should create cache with empty cache', () => {
      const cache = new ImageCache(sandbox.stub())
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
      await imageCache.fetch('/foo.jpg', 45, 50)
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
      await imageCache.fetch('/foo.jpg', 45, 50)
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
    it('should not match cache item when stored height is less than requested', async () => {
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 40,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), '', '')),
      })
      await imageCache.fetch('/foo.jpg', 45, 50)
      expect(createSpy.callCount).to.equal(1)
    })
    it('should not match cache item when stored width is less than requested', async () => {
      imageCache.items.push({
        path: '/foo.jpg',
        width: 40,
        height: 50,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), '', '')),
      })
      await imageCache.fetch('/foo.jpg', 50, 45)
      expect(createSpy.callCount).to.equal(1)
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
      expect(paths).to.deep.equal(['/foo.jpg', '/item_0.png', '/item_1.png', '/item_2.png', '/item_3.png'])
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
    it('should call cacheFunction only once for concurrent requests to same uncached path', async () => {
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.callsFake(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(ImageData.fromImage(Buffer.from(''), '', ''))
      await Promise.all([fetch1, fetch2])

      expect(createSpy.callCount).to.equal(1)
    })
    it('should return expected result to first concurrent request', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.callsFake(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(img)
      const [result1] = await Promise.all([fetch1, fetch2])

      expect(result1).to.equal(img)
    })
    it('should return expected result to second concurrent request', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.callsFake(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(img)
      const [, result2] = await Promise.all([fetch1, fetch2])

      expect(result2).to.equal(img)
    })
    it('should store only one item for concurrent requests to same uncached path', async () => {
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.callsFake(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(ImageData.fromImage(Buffer.from(''), '', ''))
      await Promise.all([fetch1, fetch2])

      expect(imageCache.items).to.have.lengthOf(1)
    })
    it('should remove a cache item from the cache after fetch returns an error result', async () => {
      const errorImg = ImageData.fromError('NOT_FOUND', 404, 'oops', '/missing.jpg')
      imageCache.items.push({
        path: '/missing.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(errorImg),
      })
      await imageCache.fetch('/missing.jpg', 50, 50)
      expect(imageCache.items.find((i) => i.path === '/missing.jpg')).to.equal(undefined)
    })
    it('should keep a cache item in the cache after fetch returns a successful result', async () => {
      const img = ImageData.fromImage(Buffer.from(''), 'jpg', '/ok.jpg')
      imageCache.items.push({
        path: '/ok.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      await imageCache.fetch('/ok.jpg', 50, 50)
      expect(imageCache.items.find((i) => i.path === '/ok.jpg')).to.not.equal(undefined)
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

    describe('LRU eviction order', () => {
      const makeCacheItem = (path: string): CacheItem => ({
        path,
        width: 100,
        height: 100,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), 'jpg', path)),
      })

      beforeEach(() => {
        ImageCache.cacheSize = 3
      })

      it('should evict the least recently used item when a new item is added to a full cache', async () => {
        // Fill cache: [A, B, C] — C is LRU (tail)
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        // Add new item — C should be evicted
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.not.include('/c.png')
      })

      it('should retain the most recently used item /a.png when cache overflows', async () => {
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.include('/a.png')
      })
      it('should retain the most recently used item /b.png when cache overflows', async () => {
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.include('/b.png')
      })

      it('should retain a recently accessed item that would otherwise have been evicted', async () => {
        // Fill cache: [A, B, C] — C is LRU
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        // Access C, promoting it to head: [C, A, B] — B is now LRU
        await imageCache.fetch('/c.png', 100, 100)
        // Add new item — B should be evicted, not C
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.include('/c.png')
      })
      it('should evict the item that became LRU after a recent access', async () => {
        // Fill cache: [A, B, C] — C is LRU
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        // Access C, promoting it to head: [C, A, B] — B is now LRU
        await imageCache.fetch('/c.png', 100, 100)
        // Add new item — B should be evicted
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.not.include('/b.png')
      })

      it('should evict the item that was least recently accessed, not the one added longest ago', async () => {
        // Fill cache: [A, B, C] — C is LRU
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        // Access C then B, making A the LRU: [B, C, A]
        await imageCache.fetch('/c.png', 100, 100)
        await imageCache.fetch('/b.png', 100, 100)
        // Add new item — A should be evicted as LRU
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.not.include('/a.png')
      })
      it('should retain /b.png when it was accessed more recently than the evicted item', async () => {
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        await imageCache.fetch('/c.png', 100, 100)
        await imageCache.fetch('/b.png', 100, 100)
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.include('/b.png')
      })
      it('should retain /c.png when it was accessed more recently than the evicted item', async () => {
        imageCache.items.push(makeCacheItem('/a.png'))
        imageCache.items.push(makeCacheItem('/b.png'))
        imageCache.items.push(makeCacheItem('/c.png'))
        await imageCache.fetch('/c.png', 100, 100)
        await imageCache.fetch('/b.png', 100, 100)
        await imageCache.fetch('/new.png', 100, 100)
        const paths = imageCache.items.map((i: CacheItem) => i.path)
        expect(paths).to.include('/c.png')
      })
    })
  })
})
