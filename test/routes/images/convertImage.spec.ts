'use sanity'

import { Imports, convertImage, ImageData } from '#routes/images.js'
import type { Sharp } from 'sharp'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('routes/images convertImage()', () => {
  let sharpInstanceStub = {
    rotate: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    resize: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    webp: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    toBuffer: vi.fn().mockResolvedValue(undefined),
  }
  let sharpStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    sharpStub = vi.spyOn(Imports, 'Sharp').mockReturnValue(cast<Sharp>(sharpInstanceStub))
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    sharpInstanceStub = {
      rotate: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      resize: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      webp: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      toBuffer: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('should abort when error already detected', async () => {
    const img = new ImageData()
    img.error = { code: 'FOO', statusCode: 500, message: 'simulated' }
    await convertImage(img)
    expect(sharpStub.mock.calls.length).toBe(0)
  })

  describe('on successful convert (animated=true)', () => {
    let img: ImageData = new ImageData()
    let data: Buffer = Buffer.from('')
    beforeEach(async () => {
      data = Buffer.from(`{ image: ${Math.random()} }`)
      img = new ImageData()
      img.data = data
      await convertImage(img, true)
    })
    it('should parse Sharp data', () => {
      expect(sharpStub.mock.calls.length).toBe(1)
    })
    it('should call Sharp with expected arg count', () => {
      expect(sharpStub.mock.calls[0]).toHaveLength(2)
    })
    it('should provide buffered data to Sharp', () => {
      expect(sharpStub.mock.calls[0]?.[0]).toBe(data)
    })
    it('should provide a set animated flag when animated convert requested', () => {
      expect(sharpStub.mock.calls[0]?.[1]).toEqual({ animated: true })
    })
    it('should rotate image to canonical orientation', () => {
      expect(sharpInstanceStub.rotate.mock.calls.length).toBe(1)
    })
    it('should provide no arguments to rotate request', () => {
      expect(sharpInstanceStub.rotate.mock.calls[0]).toEqual([])
    })
    it('should not resize the image', () => {
      expect(sharpInstanceStub.resize.mock.calls.length).toBe(0)
    })
    it('should convert image to webp via sharp', () => {
      expect(sharpInstanceStub.webp.mock.calls.length).toBe(1)
    })
    it('should set image extension to webp', () => {
      expect(img.extension).toBe('webp')
    })
    it('should convert to webp with defaults', () => {
      expect(sharpInstanceStub.webp.mock.calls[0]).toEqual([])
    })
    it('should convert result to Buffer', () => {
      expect(sharpInstanceStub.toBuffer.mock.calls.length).toBe(1)
    })
    it('should convert to buffer with defaults', () => {
      expect(sharpInstanceStub.toBuffer.mock.calls[0]).toEqual([])
    })
  })

  describe('on successful convert (animated=false)', () => {
    beforeEach(async () => {
      const img = new ImageData()
      img.data = Buffer.from(`{ image: ${Math.random()} }`)
      await convertImage(img, false)
    })
    it('should provide an unset animated flag when animated convert not requested', () => {
      expect(sharpStub.mock.calls[0]?.[1]).toEqual({ animated: false })
    })
  })

  describe('on successful convert (animated defaulted)', () => {
    beforeEach(async () => {
      const img = new ImageData()
      img.data = Buffer.from(`{ image: ${Math.random()} }`)
      await convertImage(img)
    })
    it('should default to animated conversion', () => {
      expect(sharpStub.mock.calls[0]?.[1]).toEqual({ animated: true })
    })
  })

  it('should output as buffer', async () => {
    const img = new ImageData()
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    sharpInstanceStub.toBuffer.mockResolvedValue(data)
    await convertImage(img)
    expect(img.data).toBe(data)
  })

  const failureModes: Array<[string, () => unknown]> = [
    [
      'sharp throws',
      () =>
        sharpStub.mockImplementation(() => {
          throw new Error('OOPS')
        }),
    ],
    ['sharp rejects', () => sharpInstanceStub.toBuffer.mockRejectedValue(new Error('OOPS'))],
  ]
  failureModes.forEach(([modeName, induceFailure]) => {
    describe(`when ${modeName}`, () => {
      let img = new ImageData()
      beforeEach(() => {
        img = new ImageData()
        induceFailure()
      })
      it('should leave error unset', async () => {
        await convertImage(img)
        expect(img.error).toBe(null)
      })
      it('should not update extension', async () => {
        img.extension = 'jpg'
        await convertImage(img)
        expect(img.extension).toBe('jpg')
      })
      it('should not update data', async () => {
        const originalData = Buffer.from('original')
        img.data = originalData
        await convertImage(img)
        expect(img.data).toBe(originalData)
      })
    })
  })

  describe('failure logging', () => {
    it('should log convert-failed format when sharp throws', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await convertImage(img)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('convert failed for %s: %s')
    })

    it('should log the image path when sharp throws', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await convertImage(img)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo/bar.jpg')
    })

    it('should log the error message when sharp throws an Error', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await convertImage(img)
      expect(loggerStub.mock.calls[0]?.[2]).toBe('OOPS')
    })

    it('should log a string fallback when sharp rejects with a non-Error', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpInstanceStub.toBuffer.mockImplementation(async () => {
        await Promise.resolve()
        throw cast<Error>({ toString: () => 'rejection-token' })
      })
      await convertImage(img)
      expect(loggerStub.mock.calls[0]?.[2]).toBe('rejection-token')
    })

    it('should not log on successful convert', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      img.data = Buffer.from('data')
      await convertImage(img)
      expect(loggerStub.mock.calls.length).toBe(0)
    })

    it('should not log when image already has an error code', async () => {
      const img = new ImageData()
      img.error = { code: 'E_PRIOR', statusCode: 500, message: 'simulated' }
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await convertImage(img)
      expect(loggerStub.mock.calls.length).toBe(0)
    })
  })
})
