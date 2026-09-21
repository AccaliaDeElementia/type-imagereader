'use sanity'

import { CacheStorage } from '#routes/images.js'
import type { ImageCache } from '#routes/images.js'

const REQUESTED_PATH = '/foo.png'
const KIOSK_WIDTH = 1280
const KIOSK_HEIGHT = 800
const UNBOUNDED = 0

interface DefaultCache {
  name: string
  read: () => ImageCache
  width: number
  height: number
}

const defaultCaches: DefaultCache[] = [
  { name: 'kiosk', read: () => CacheStorage.kioskCache, width: KIOSK_WIDTH, height: KIOSK_HEIGHT },
  { name: 'scaled', read: () => CacheStorage.scaledCache, width: KIOSK_WIDTH, height: KIOSK_HEIGHT },
  { name: 'original', read: () => CacheStorage.originalCache, width: UNBOUNDED, height: UNBOUNDED },
]

describe('routes/images export CacheStorage()', () => {
  defaultCaches.forEach(({ name, read, width, height }: DefaultCache): void => {
    it(`should report the uninitialized-cache error from the default ${name} cache`, async () => {
      const image = await read().fetch(REQUESTED_PATH, width, height)
      expect({ error: image.error, path: image.path }).toEqual({
        error: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500, message: 'CACHE_NOT_INITIALIZED' },
        path: REQUESTED_PATH,
      })
    })
  })
})
