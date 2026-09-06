'use sanity'

import { readAndConvertImage, Internals, type ImageData } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

const IGNORED_WIDTH = 0
const IGNORED_HEIGHT = 0

describe('routes/images readAndConvertImage()', () => {
  let readImageStub: MockInstance = vi.fn()
  let convertImageStub: MockInstance = vi.fn()
  beforeEach(() => {
    readImageStub = vi.spyOn(Internals, 'readImage').mockResolvedValue(cast<ImageData>(undefined))
    convertImageStub = vi.spyOn(Internals, 'convertImage').mockReturnValue(Promise.resolve())
  })
  it('should call readImage once', async () => {
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT)
    expect(readImageStub.mock.calls.length).toBe(1)
  })
  it('should read image as requested', async () => {
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT)
    expect(readImageStub.mock.calls[0]).toEqual(['/foo.png'])
  })
  it('should call convertImage once', async () => {
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT)
    expect(convertImageStub.mock.calls.length).toBe(1)
  })
  it('should convert image as read', async () => {
    const img = Math.random()
    readImageStub.mockResolvedValue(img)
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT)
    expect(convertImageStub.mock.calls[0]?.[0]).toBe(img)
  })
  it('should return image as read', async () => {
    const img = Math.random()
    readImageStub.mockResolvedValue(img)
    const result = await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT)
    expect(result).toBe(cast<ImageData>(img))
  })
  it('should default enable animated image support', async () => {
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT)
    expect(convertImageStub.mock.calls[0]?.[1]).toBe(true)
  })
  it('should enable animated image support explicitly', async () => {
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT, true)
    expect(convertImageStub.mock.calls[0]?.[1]).toBe(true)
  })
  it('should disable animated image support explicitly', async () => {
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT, false)
    expect(convertImageStub.mock.calls[0]?.[1]).toBe(false)
  })
  it('should not rescale the image', async () => {
    const rescaleImageStub = vi.spyOn(Internals, 'rescaleImage').mockReturnValue(Promise.resolve())
    await readAndConvertImage('/foo.png', IGNORED_WIDTH, IGNORED_HEIGHT)
    expect(rescaleImageStub.mock.calls.length).toBe(0)
  })
})
