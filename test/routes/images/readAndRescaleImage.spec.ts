'use sanity'

import { readAndRescaleImage, Internals, type ImageData } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'
describe('routes/images readAndRescaleImage()', () => {
  let readImageStub: MockInstance = vi.fn()
  let rescaleImageStub: MockInstance = vi.fn()
  beforeEach(() => {
    readImageStub = vi.spyOn(Internals, 'readImage').mockResolvedValue(cast<ImageData>(undefined))
    rescaleImageStub = vi.spyOn(Internals, 'rescaleImage').mockReturnValue(Promise.resolve())
  })
  it('should call readImage once', async () => {
    await readAndRescaleImage('/foo.png', 999, 999)
    expect(readImageStub.mock.calls.length).toBe(1)
  })
  it('should read image as requested', async () => {
    await readAndRescaleImage('/foo.png', 999, 999)
    expect(readImageStub.mock.calls[0]).toEqual(['/foo.png'])
  })
  it('should call rescaleImage once when rescaling', async () => {
    const img = Math.random()
    readImageStub.mockResolvedValue(img)
    const width = Math.random()
    const height = Math.random()
    await readAndRescaleImage('/foo.png', width, height, true)
    expect(rescaleImageStub.mock.calls.length).toBe(1)
  })
  it('should rescale image as read', async () => {
    const img = Math.random()
    readImageStub.mockResolvedValue(img)
    const width = Math.random()
    const height = Math.random()
    await readAndRescaleImage('/foo.png', width, height, true)
    expect(rescaleImageStub.mock.calls[0]).toEqual([img, width, height, true])
  })
  it('should call rescaleImage once with default animated support', async () => {
    await readAndRescaleImage('/foo.png', 99, 99)
    expect(rescaleImageStub.mock.calls.length).toBe(1)
  })
  it('should default enable animated image support', async () => {
    await readAndRescaleImage('/foo.png', 99, 99)
    expect(rescaleImageStub.mock.calls[0]?.[3]).toBe(true)
  })
  it('should call rescaleImage once when enabling animated support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, true)
    expect(rescaleImageStub.mock.calls.length).toBe(1)
  })
  it('should enable animated image support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, true)
    expect(rescaleImageStub.mock.calls[0]?.[3]).toBe(true)
  })
  it('should call rescaleImage once when disabling animated support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, false)
    expect(rescaleImageStub.mock.calls.length).toBe(1)
  })
  it('should disable animated image support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, false)
    expect(rescaleImageStub.mock.calls[0]?.[3]).toBe(false)
  })
})
