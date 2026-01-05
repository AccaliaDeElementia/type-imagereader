'use sanity'

import { expect } from 'chai'
import { CacheStorage } from '../../../routes/images'
describe('routes/images export CacheStorage()', () => {
  it('should have default Kiosk Cache report error code', async () => {
    const image = await CacheStorage.kioskCache.fetch('/foo.png', 1280, 800)
    expect(image.code).to.equal('INTERNAL_SERVER_ERROR')
  })
  it('should have default Kiosk Cache report error statusCode', async () => {
    const image = await CacheStorage.kioskCache.fetch('/foo.png', 1280, 800)
    expect(image.statusCode).to.equal(500)
  })
  it('should have default Kiosk Cache report error message', async () => {
    const image = await CacheStorage.kioskCache.fetch('/foo.png', 1280, 800)
    expect(image.message).to.equal('CACHE_NOT_INITIALIZED')
  })
  it('should have default Kiosk Cache resolve to requested path', async () => {
    const image = await CacheStorage.kioskCache.fetch('/foo.png', 1280, 800)
    expect(image.path).to.equal('/foo.png')
  })
  it('should have default scaled Cache report error code', async () => {
    const image = await CacheStorage.scaledCache.fetch('/foo.png', 1280, 800)
    expect(image.code).to.equal('INTERNAL_SERVER_ERROR')
  })
  it('should have default scaled Cache report error status code', async () => {
    const image = await CacheStorage.scaledCache.fetch('/foo.png', 1280, 800)
    expect(image.statusCode).to.equal(500)
  })
  it('should have default scaled Cache report error message', async () => {
    const image = await CacheStorage.scaledCache.fetch('/foo.png', 1280, 800)
    expect(image.message).to.equal('CACHE_NOT_INITIALIZED')
  })
  it('should have default scaled Cache resolve to requested path', async () => {
    const image = await CacheStorage.scaledCache.fetch('/foo.png', 1280, 800)
    expect(image.path).to.equal('/foo.png')
  })
})
