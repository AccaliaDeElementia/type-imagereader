'use sanity'

import { type CacheItem, ImageCache, ImageData } from '#routes/images.js'
import { UNBOUNDED } from '#contracts/scaledImage.js'
describe('routes/images ImageData', () => {
  const defaultCacheSize = ImageCache.cacheSize
  let createSpy = vi.fn()
  let imageCache = new ImageCache(createSpy)
  beforeEach(() => {
    ImageCache.cacheSize = 5
    createSpy = vi.fn().mockResolvedValue(ImageData.fromImage(Buffer.from(''), '', ''))
    imageCache = new ImageCache(createSpy)
  })
  afterAll(() => {
    ImageCache.cacheSize = defaultCacheSize
  })
  describe('ctor', () => {
    it('should store cache item creation function', () => {
      const spy = vi.fn().mockResolvedValue(undefined)
      const cache = new ImageCache(spy)
      expect(cache.cacheFunction).toBe(spy)
    })
    it('should create cache with empty cache', () => {
      const cache = new ImageCache(vi.fn())
      expect(cache.items).toHaveLength(0)
    })
    it('should leave maxItems unset when no size limit is provided', () => {
      const cache = new ImageCache(vi.fn())
      expect(cache.maxItems).toBe(undefined)
    })
    it('should store an explicit size limit', () => {
      const cache = new ImageCache(vi.fn(), 3)
      expect(cache.maxItems).toBe(3)
    })
  })
  describe('per instance size limit', () => {
    it('should evict down to the instance limit when it is smaller than the shared default', async () => {
      const cache = new ImageCache(createSpy, 2)
      await cache.fetch('/a.png', 100, 100)
      await cache.fetch('/b.png', 100, 100)
      await cache.fetch('/c.png', 100, 100)
      expect(cache.items).toHaveLength(2)
    })
    it('should retain the most recently fetched item within the instance limit', async () => {
      const cache = new ImageCache(createSpy, 2)
      await cache.fetch('/a.png', 100, 100)
      await cache.fetch('/b.png', 100, 100)
      await cache.fetch('/c.png', 100, 100)
      expect(cache.items.map((item) => item.path)).toContain('/c.png')
    })
    it('should ignore later changes to the shared default when an instance limit is set', async () => {
      const cache = new ImageCache(createSpy, 2)
      ImageCache.cacheSize = 100
      await cache.fetch('/a.png', 100, 100)
      await cache.fetch('/b.png', 100, 100)
      await cache.fetch('/c.png', 100, 100)
      expect(cache.items).toHaveLength(2)
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
      expect(await imageCache.fetch('/foo.jpg', 50, 50)).toBe(img)
    })
    it('should fetch existing match item with larger width', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 45, 50)).toBe(img)
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
      expect(imageCache.items).toHaveLength(1)
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
      expect(createSpy.mock.calls.length).toBe(0)
    })
    it('should fetch existing match item with larger height', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 50, 45)).toBe(img)
    })
    it('should not match cache item when stored height is less than requested', async () => {
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 40,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), '', '')),
      })
      await imageCache.fetch('/foo.jpg', 45, 50)
      expect(createSpy.mock.calls.length).toBe(1)
    })
    it('should not match cache item when stored width is less than requested', async () => {
      imageCache.items.push({
        path: '/foo.jpg',
        width: 40,
        height: 50,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), '', '')),
      })
      await imageCache.fetch('/foo.jpg', 50, 45)
      expect(createSpy.mock.calls.length).toBe(1)
    })
    it('should fetch existing match item with larger width and height', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 45, 45)).toBe(img)
    })
    it('should not serve an unbounded entry to a bounded request', async () => {
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: UNBOUNDED,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), '', '')),
      })
      await imageCache.fetch('/foo.jpg', 50, 45)
      expect(createSpy.mock.calls.length).toBe(1)
    })
    it('should not serve a bounded entry to an unbounded request', async () => {
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: 50,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), '', '')),
      })
      await imageCache.fetch('/foo.jpg', 50, UNBOUNDED)
      expect(createSpy.mock.calls.length).toBe(1)
    })
    it('should serve an unbounded entry to a matching unbounded request', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: UNBOUNDED,
        image: Promise.resolve(img),
      })
      expect(await imageCache.fetch('/foo.jpg', 45, UNBOUNDED)).toBe(img)
    })
    it('should not serve a narrower unbounded entry to a wider unbounded request', async () => {
      imageCache.items.push({
        path: '/foo.jpg',
        width: 50,
        height: UNBOUNDED,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), '', '')),
      })
      await imageCache.fetch('/foo.jpg', 60, UNBOUNDED)
      expect(createSpy.mock.calls.length).toBe(1)
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
      expect(paths).toEqual(['/foo.jpg', '/item_0.png', '/item_1.png', '/item_2.png', '/item_3.png'])
    })
    it('should create new cache item when query not found', async () => {
      await imageCache.fetch('/foo.jpg', 45, 45)
      expect(createSpy.mock.calls.length).toBe(1)
    })
    it('should provide expected parameters to create function when entry not found', async () => {
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(createSpy.mock.calls[0]).toEqual(['/foo.jpg', 45, 54])
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
      createSpy.mockResolvedValue(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(imageCache.items[0]?.path).toBe('/foo.jpg')
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
      createSpy.mockResolvedValue(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(imageCache.items[0]?.width).toBe(45)
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
      createSpy.mockResolvedValue(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      expect(imageCache.items[0]?.height).toBe(54)
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
      createSpy.mockResolvedValue(img)
      await imageCache.fetch('/foo.jpg', 45, 54)
      const result = await imageCache.items[0]?.image
      expect(result).toBe(img)
    })
    it('should call cacheFunction only once for concurrent requests to same uncached path', async () => {
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.mockImplementation(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(ImageData.fromImage(Buffer.from(''), '', ''))
      await Promise.all([fetch1, fetch2])

      expect(createSpy.mock.calls.length).toBe(1)
    })
    it('should return expected result to first concurrent request', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.mockImplementation(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(img)
      const [result1] = await Promise.all([fetch1, fetch2])

      expect(result1).toBe(img)
    })
    it('should return expected result to second concurrent request', async () => {
      const img = ImageData.fromImage(Buffer.from(''), '', '')
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.mockImplementation(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(img)
      const [, result2] = await Promise.all([fetch1, fetch2])

      expect(result2).toBe(img)
    })
    it('should store only one item for concurrent requests to same uncached path', async () => {
      const { promise, resolve } = Promise.withResolvers<ImageData>()
      createSpy.mockImplementation(async () => await promise)

      const fetch1 = imageCache.fetch('/foo.jpg', 50, 50)
      const fetch2 = imageCache.fetch('/foo.jpg', 50, 50)
      resolve(ImageData.fromImage(Buffer.from(''), '', ''))
      await Promise.all([fetch1, fetch2])

      expect(imageCache.items).toHaveLength(1)
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
      expect(imageCache.items.find((i) => i.path === '/missing.jpg')).toBe(undefined)
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
      expect(imageCache.items.find((i) => i.path === '/ok.jpg')).not.toBe(undefined)
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
      expect(paths).toEqual(['/foo.jpg', '/item_0.png', '/item_1.png', '/item_2.png', '/item_3.png'])
    })

    describe('LRU eviction order', () => {
      const ITEM_WIDTH = 100
      const ITEM_HEIGHT = 100
      const makeCacheItem = (path: string): CacheItem => ({
        path,
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        image: Promise.resolve(ImageData.fromImage(Buffer.from(''), 'jpg', path)),
      })

      const fillCacheHeadToTail = (...paths: string[]): void => {
        for (const path of paths) imageCache.items.push(makeCacheItem(path))
      }
      const accessItem = async (path: string): Promise<void> => {
        await imageCache.fetch(path, ITEM_WIDTH, ITEM_HEIGHT)
      }
      const addNewItem = async (): Promise<void> => {
        await accessItem('/new.png')
      }
      const cachedPaths = (): string[] => imageCache.items.map((i: CacheItem) => i.path)

      beforeEach(() => {
        ImageCache.cacheSize = 3
      })

      it('should evict the least recently used item when a new item is added to a full cache', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await addNewItem()
        expect(cachedPaths()).not.toContain('/c.png')
      })

      it('should retain the most recently used item /a.png when cache overflows', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await addNewItem()
        expect(cachedPaths()).toContain('/a.png')
      })
      it('should retain the most recently used item /b.png when cache overflows', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await addNewItem()
        expect(cachedPaths()).toContain('/b.png')
      })

      it('should retain a recently accessed item that would otherwise have been evicted', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await accessItem('/c.png')
        await addNewItem()
        expect(cachedPaths()).toContain('/c.png')
      })
      it('should evict the item that became LRU after a recent access', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await accessItem('/c.png')
        await addNewItem()
        expect(cachedPaths()).not.toContain('/b.png')
      })

      it('should evict the item that was least recently accessed, not the one added longest ago', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await accessItem('/c.png')
        await accessItem('/b.png')
        await addNewItem()
        expect(cachedPaths()).not.toContain('/a.png')
      })
      it('should retain /b.png when it was accessed more recently than the evicted item', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await accessItem('/c.png')
        await accessItem('/b.png')
        await addNewItem()
        expect(cachedPaths()).toContain('/b.png')
      })
      it('should retain /c.png when it was accessed more recently than the evicted item', async () => {
        fillCacheHeadToTail('/a.png', '/b.png', '/c.png')
        await accessItem('/c.png')
        await accessItem('/b.png')
        await addNewItem()
        expect(cachedPaths()).toContain('/c.png')
      })
    })
  })
})
