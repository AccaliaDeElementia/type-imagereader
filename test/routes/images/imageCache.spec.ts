'use sanity'

import { type CacheItem, ImageCache, ImageData } from '#routes/images.js'
import { UNBOUNDED } from '#contracts/scaledImage.js'

const CACHED_PATH = '/foo.jpg'
const NEW_PATH = '/new.png'
const SHARED_CACHE_SIZE = 5
const EVICTION_CACHE_SIZE = 3
const ITEM_SIZE = 100

const makeImage = (path = ''): ImageData => ImageData.fromImage(Buffer.from(''), '', path)

const dimension = (value: number): string => (value === UNBOUNDED ? 'auto' : String(value))

interface MatchCase {
  storedWidth: number
  storedHeight: number
  requestedWidth: number
  requestedHeight: number
  servedFromCache: boolean
}

const matchCases: MatchCase[] = [
  { storedWidth: 50, storedHeight: 50, requestedWidth: 50, requestedHeight: 50, servedFromCache: true },
  { storedWidth: 50, storedHeight: 50, requestedWidth: 45, requestedHeight: 50, servedFromCache: true },
  { storedWidth: 50, storedHeight: 50, requestedWidth: 50, requestedHeight: 45, servedFromCache: true },
  { storedWidth: 50, storedHeight: 50, requestedWidth: 45, requestedHeight: 45, servedFromCache: true },
  { storedWidth: 50, storedHeight: 40, requestedWidth: 45, requestedHeight: 50, servedFromCache: false },
  { storedWidth: 40, storedHeight: 50, requestedWidth: 50, requestedHeight: 45, servedFromCache: false },
  { storedWidth: 50, storedHeight: UNBOUNDED, requestedWidth: 50, requestedHeight: 45, servedFromCache: false },
  { storedWidth: 50, storedHeight: 50, requestedWidth: 50, requestedHeight: UNBOUNDED, servedFromCache: false },
  { storedWidth: 50, storedHeight: UNBOUNDED, requestedWidth: 45, requestedHeight: UNBOUNDED, servedFromCache: true },
  { storedWidth: 50, storedHeight: UNBOUNDED, requestedWidth: 60, requestedHeight: UNBOUNDED, servedFromCache: false },
]

interface RetentionCase {
  outcome: string
  path: string
  image: () => ImageData
  retained: boolean
}

const retentionCases: RetentionCase[] = [
  {
    outcome: 'an error',
    path: '/missing.jpg',
    image: () => ImageData.fromError('NOT_FOUND', 404, 'oops', '/missing.jpg'),
    retained: false,
  },
  {
    outcome: 'a successful',
    path: '/ok.jpg',
    image: () => ImageData.fromImage(Buffer.from(''), 'jpg', '/ok.jpg'),
    retained: true,
  },
]

interface EvictionCase {
  scenario: string
  accesses: string[]
  expectedPaths: string[]
}

const evictionCases: EvictionCase[] = [
  { scenario: 'no intervening access', accesses: [], expectedPaths: [NEW_PATH, '/a.png', '/b.png'] },
  {
    scenario: 'the tail item accessed first',
    accesses: ['/c.png'],
    expectedPaths: [NEW_PATH, '/c.png', '/a.png'],
  },
  {
    scenario: 'the two tail items accessed first',
    accesses: ['/c.png', '/b.png'],
    expectedPaths: [NEW_PATH, '/b.png', '/c.png'],
  },
]

describe('routes/images ImageCache', () => {
  const defaultCacheSize = ImageCache.cacheSize
  let createSpy = vi.fn()
  let imageCache = new ImageCache(createSpy)
  beforeEach(() => {
    ImageCache.cacheSize = SHARED_CACHE_SIZE
    createSpy = vi.fn().mockResolvedValue(makeImage())
    imageCache = new ImageCache(createSpy)
  })
  afterAll(() => {
    ImageCache.cacheSize = defaultCacheSize
  })

  const pushItem = (path: string, width: number, height: number, image: ImageData): void => {
    imageCache.items.push({ path, width, height, image: Promise.resolve(image) })
  }
  const fillWithStaleItems = (count: number): void => {
    for (let i = 0; i < count; i += 1) {
      pushItem(`/item_${i}.png`, ITEM_SIZE + i, ITEM_SIZE + i, ImageData.fromError('foo', 600, 'bar', `/item_${i}.png`))
    }
  }
  const cachedPaths = (): string[] => imageCache.items.map((item: CacheItem) => item.path)

  describe('ctor', () => {
    it('should start with the given cache function, no items and no size limit', () => {
      const spy = vi.fn().mockResolvedValue(undefined)
      const cache = new ImageCache(spy)
      expect({ cacheFunction: cache.cacheFunction, items: cache.items, maxItems: cache.maxItems }).toEqual({
        cacheFunction: spy,
        items: [],
        maxItems: undefined,
      })
    })
    it('should store an explicit size limit', () => {
      const cache = new ImageCache(vi.fn(), 3)
      expect(cache.maxItems).toBe(3)
    })
  })

  describe('per instance size limit', () => {
    it('should evict down to the instance limit, keeping the most recently fetched items', async () => {
      const cache = new ImageCache(createSpy, 2)
      await cache.fetch('/a.png', ITEM_SIZE, ITEM_SIZE)
      await cache.fetch('/b.png', ITEM_SIZE, ITEM_SIZE)
      await cache.fetch('/c.png', ITEM_SIZE, ITEM_SIZE)
      expect(cache.items.map((item: CacheItem) => item.path)).toEqual(['/c.png', '/b.png'])
    })
    it('should ignore later changes to the shared default when an instance limit is set', async () => {
      const cache = new ImageCache(createSpy, 2)
      ImageCache.cacheSize = 100
      await cache.fetch('/a.png', ITEM_SIZE, ITEM_SIZE)
      await cache.fetch('/b.png', ITEM_SIZE, ITEM_SIZE)
      await cache.fetch('/c.png', ITEM_SIZE, ITEM_SIZE)
      expect(cache.items).toHaveLength(2)
    })
  })

  describe('fetch()', () => {
    matchCases.forEach(
      ({ storedWidth, storedHeight, requestedWidth, requestedHeight, servedFromCache }: MatchCase): void => {
        const stored = `${dimension(storedWidth)}x${dimension(storedHeight)}`
        const requested = `${dimension(requestedWidth)}x${dimension(requestedHeight)}`
        it(`should ${servedFromCache ? 'serve' : 'refuse'} a ${stored} entry for a ${requested} request`, async () => {
          const cached = makeImage()
          pushItem(CACHED_PATH, storedWidth, storedHeight, cached)
          const result = await imageCache.fetch(CACHED_PATH, requestedWidth, requestedHeight)
          expect({
            servedFromCache: result === cached,
            created: createSpy.mock.calls.length,
            items: imageCache.items.length,
          }).toEqual({
            servedFromCache,
            created: servedFromCache ? 0 : 1,
            items: servedFromCache ? 1 : 2,
          })
        })
      },
    )

    it('should call the cache function once with the requested path and dimensions on a miss', async () => {
      await imageCache.fetch(CACHED_PATH, 45, 54)
      expect(createSpy.mock.calls).toEqual([[CACHED_PATH, 45, 54]])
    })
    it('should store the requested path, dimensions and image at the head on a miss', async () => {
      const img = makeImage()
      createSpy.mockResolvedValue(img)
      fillWithStaleItems(10)
      await imageCache.fetch(CACHED_PATH, 45, 54)
      const [head] = imageCache.items
      expect({ path: head?.path, width: head?.width, height: head?.height, image: await head?.image }).toEqual({
        path: CACHED_PATH,
        width: 45,
        height: 54,
        image: img,
      })
    })
    it('should move an existing item to the head of the cache queue on retrieval', async () => {
      fillWithStaleItems(10)
      pushItem(CACHED_PATH, 50, 50, makeImage())
      await imageCache.fetch(CACHED_PATH, 45, 45)
      expect(cachedPaths()).toEqual([CACHED_PATH, '/item_0.png', '/item_1.png', '/item_2.png', '/item_3.png'])
    })
    it('should prune older unused cache items when a new item overflows a full cache', async () => {
      fillWithStaleItems(10)
      await imageCache.fetch(CACHED_PATH, 45, 45)
      expect(cachedPaths()).toEqual([CACHED_PATH, '/item_0.png', '/item_1.png', '/item_2.png', '/item_3.png'])
    })

    describe('concurrent requests for the same uncached path', () => {
      let img = makeImage()
      let results: ImageData[] = []
      beforeEach(async () => {
        img = makeImage()
        const { promise, resolve } = Promise.withResolvers<ImageData>()
        createSpy.mockImplementation(async () => await promise)
        const first = imageCache.fetch(CACHED_PATH, 50, 50)
        const second = imageCache.fetch(CACHED_PATH, 50, 50)
        resolve(img)
        results = await Promise.all([first, second])
      })
      it('should call the cache function once and store a single item', () => {
        expect({ calls: createSpy.mock.calls.length, items: imageCache.items.length }).toEqual({ calls: 1, items: 1 })
      })
      it('should resolve every concurrent request with the one created image', () => {
        expect(results.map((result: ImageData) => result === img)).toEqual([true, true])
      })
    })

    retentionCases.forEach(({ outcome, path, image, retained }: RetentionCase): void => {
      it(`should ${retained ? 'keep' : 'remove'} a cache item after fetch returns ${outcome} result`, async () => {
        pushItem(path, 50, 50, image())
        await imageCache.fetch(path, 50, 50)
        expect(cachedPaths()).toEqual(retained ? [path] : [])
      })
    })

    describe('LRU eviction order', () => {
      beforeEach(() => {
        ImageCache.cacheSize = EVICTION_CACHE_SIZE
      })

      evictionCases.forEach(({ scenario, accesses, expectedPaths }: EvictionCase): void => {
        it(`should hold ${expectedPaths.join(', ')} after overflowing a full cache with ${scenario}`, async () => {
          for (const path of ['/a.png', '/b.png', '/c.png']) {
            pushItem(path, ITEM_SIZE, ITEM_SIZE, makeImage(path))
          }
          /* eslint-disable no-await-in-loop -- access order is the invariant under test, so the fetches must be serial */
          for (const path of accesses) {
            await imageCache.fetch(path, ITEM_SIZE, ITEM_SIZE)
          }
          /* eslint-enable no-await-in-loop */
          await imageCache.fetch(NEW_PATH, ITEM_SIZE, ITEM_SIZE)
          expect(cachedPaths()).toEqual(expectedPaths)
        })
      })
    })
  })
})
