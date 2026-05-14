'use sanity'

import { Imports, rescaleImage, ImageData } from '#routes/images.js'
import Sharp from 'sharp'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('routes/images rescaleImage()', () => {
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
    sharpStub = vi.spyOn(Imports, 'Sharp').mockReturnValue(cast<Sharp.Sharp>(sharpInstanceStub))
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

  interface SharpResizeArgs {
    width: unknown
    height: unknown
    fit: unknown
    withoutEnlargement: unknown
  }
  const getSharpArgs = (): SharpResizeArgs => cast<SharpResizeArgs>(sharpInstanceStub.resize.mock.calls[0]?.[0])

  it('should abort when error already detected', async () => {
    const img = new ImageData()
    img.code = 'FOO'
    await rescaleImage(img, 1280, 720)
    expect(sharpStub.mock.calls.length).toBe(0)
  })

  describe('on successful rescale (animated=true)', () => {
    let img: ImageData = new ImageData()
    let data: Buffer = Buffer.from('')
    beforeEach(async () => {
      data = Buffer.from(`{ image: ${Math.random()} }`)
      img = new ImageData()
      img.data = data
      await rescaleImage(img, 1280, 720, true)
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
    it('should provide a set animated flag when animated resize requested', () => {
      expect(sharpStub.mock.calls[0]?.[1]).toEqual({ animated: true })
    })
    it('should rotate image to canonical orientation', () => {
      expect(sharpInstanceStub.rotate.mock.calls.length).toBe(1)
    })
    it('should provide no arguments to rotate request', () => {
      expect(sharpInstanceStub.rotate.mock.calls[0]).toEqual([])
    })
    it('should resize image', () => {
      expect(sharpInstanceStub.resize.mock.calls.length).toBe(1)
    })
    it('should call resize image with config flags', () => {
      expect(sharpInstanceStub.resize.mock.calls[0]).toHaveLength(1)
    })
    it('should call resize image with expected set config flags', () => {
      expect(Object.keys(getSharpArgs()).sort()).toEqual(['width', 'height', 'fit', 'withoutEnlargement'].sort())
    })
    it('should call resize image with width flag', () => {
      expect(getSharpArgs().width).toBe(1280)
    })
    it('should call resize image with height flag', () => {
      expect(getSharpArgs().height).toBe(720)
    })
    it('should call resize image with fit flag', () => {
      expect(getSharpArgs().fit).toBe(Sharp.fit.inside)
    })
    it('should call resize image with withoutEnlargement flag', () => {
      expect(getSharpArgs().withoutEnlargement).toBe(true)
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

  describe('on successful rescale (animated=false)', () => {
    beforeEach(async () => {
      const img = new ImageData()
      img.data = Buffer.from(`{ image: ${Math.random()} }`)
      await rescaleImage(img, 1280, 720, false)
    })
    it('should provide an unset animated flag when animated resize not requested', () => {
      expect(sharpStub.mock.calls[0]?.[1]).toEqual({ animated: false })
    })
  })

  it('should output as buffer', async () => {
    const img = new ImageData()
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    sharpInstanceStub.toBuffer.mockResolvedValue(data)
    await rescaleImage(img, 1280, 720)
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
      it('should not set error code', async () => {
        await rescaleImage(img, 1280, 720)
        expect(img.code).toBe(null)
      })
      it('should not set error status code', async () => {
        await rescaleImage(img, 1280, 720)
        expect(img.statusCode).toBe(0)
      })
      it('should not set error message', async () => {
        await rescaleImage(img, 1280, 720)
        expect(img.message).toBe(null)
      })
      it('should not update extension', async () => {
        img.extension = 'jpg'
        await rescaleImage(img, 1280, 720)
        expect(img.extension).toBe('jpg')
      })
      it('should not update data', async () => {
        const originalData = Buffer.from('original')
        img.data = originalData
        await rescaleImage(img, 1280, 720)
        expect(img.data).toBe(originalData)
      })
    })
  })

  describe('failure logging', () => {
    it('should log rescale-failed format when sharp throws', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('rescale failed for %s: %s')
    })

    it('should log the image path when sharp throws', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo/bar.jpg')
    })

    it('should log the error message when sharp throws an Error', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.mock.calls[0]?.[2]).toBe('OOPS')
    })

    it('should log a string fallback when sharp rejects with a non-Error', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpInstanceStub.toBuffer.mockImplementation(async () => {
        await Promise.resolve()
        throw cast<Error>({ toString: () => 'rejection-token' })
      })
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.mock.calls[0]?.[2]).toBe('rejection-token')
    })

    it('should not log on successful rescale', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      img.data = Buffer.from('data')
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.mock.calls.length).toBe(0)
    })

    it('should not log when image already has an error code', async () => {
      const img = new ImageData()
      img.code = 'E_PRIOR'
      sharpStub.mockImplementation(() => {
        throw new Error('OOPS')
      })
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.mock.calls.length).toBe(0)
    })
  })
})
