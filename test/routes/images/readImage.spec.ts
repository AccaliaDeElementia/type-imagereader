'use sanity'

import { Imports, readImage, ImageData } from '#routes/images.js'
import { StatusCodes } from 'http-status-codes'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('routes/images readImage()', () => {
  let fromErrorStub: MockInstance = vi.fn()
  let fromImageStub: MockInstance = vi.fn()
  let readFileStub: MockInstance = vi.fn()
  let isPathTraversalStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    fromErrorStub = vi.spyOn(ImageData, 'fromError').mockImplementation(cast(() => undefined))
    fromImageStub = vi.spyOn(ImageData, 'fromImage').mockImplementation(cast(() => undefined))
    readFileStub = vi.spyOn(Imports, 'readFile').mockResolvedValue(cast<string>(undefined))
    isPathTraversalStub = vi.spyOn(Imports, 'isPathTraversal').mockReturnValue(false)
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  const configureReadFile = (stub: MockInstance, result: Promise<unknown> | Error): void => {
    if (result instanceof Error) {
      stub.mockRejectedValue(result)
    } else {
      stub.mockReturnValue(result)
    }
  }

  const rejectors: Array<[string, string, string, number, string, Promise<unknown> | Error]> = [
    [
      'non image path',
      '/foo/bar/image',
      'E_NOT_IMAGE',
      StatusCodes.BAD_REQUEST,
      'Requested Path is Not An Image!',
      Promise.resolve(),
    ],
    [
      'non image extension',
      '/foo/bar/image.exe',
      'E_NOT_IMAGE',
      StatusCodes.BAD_REQUEST,
      'Requested Path is Not An Image!',
      Promise.resolve(),
    ],
    [
      'missing image file',
      '/foo/bar/image.jpg',
      'E_NOT_FOUND',
      StatusCodes.NOT_FOUND,
      'Requested Path Not Found!',
      new Error('FOO NOT FOUND'),
    ],
    [
      'dotfile with no extension',
      '/foo/.hidden',
      'E_NOT_IMAGE',
      StatusCodes.BAD_REQUEST,
      'Requested Path is Not An Image!',
      Promise.resolve(),
    ],
    [
      'dotfile with non-image extension',
      '/foo/.hidden.exe',
      'E_NOT_IMAGE',
      StatusCodes.BAD_REQUEST,
      'Requested Path is Not An Image!',
      Promise.resolve(),
    ],
  ]
  rejectors.forEach(([scenarioTitle, path, errorCode, statusCode, message, readFileResult]) => {
    describe(scenarioTitle, () => {
      const img = { img: Math.random() }
      let result: ImageData = cast<ImageData>({})
      beforeEach(async () => {
        configureReadFile(readFileStub, readFileResult)
        fromErrorStub.mockReturnValue(img)
        result = await readImage(path)
      })
      it('should reject with error ImageData', () => {
        expect(result).toBe(img)
      })
      it('should call ImageData.fromError once', () => {
        expect(fromErrorStub.mock.calls.length).toBe(1)
      })
      it('should call ImageData.fromError with 4 arguments', () => {
        expect(fromErrorStub.mock.calls[0]).toHaveLength(4)
      })
      it('should reject with expected error code', () => {
        expect(fromErrorStub.mock.calls[0]?.[0]).toBe(errorCode)
      })
      it('should reject with expected status code', () => {
        expect(fromErrorStub.mock.calls[0]?.[1]).toBe(statusCode)
      })
      it('should reject with expected error message', () => {
        expect(fromErrorStub.mock.calls[0]?.[2]).toBe(message)
      })
      it('should reject with expected path', () => {
        expect(fromErrorStub.mock.calls[0]?.[3]).toBe(path)
      })
    })
  })

  it('should call isPathTraversal with the path', async () => {
    await readImage('/foo/bar/image.png')
    expect(isPathTraversalStub.mock.calls[0]).toEqual(['/foo/bar/image.png'])
  })
  it('should return E_NO_TRAVERSE error when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    const img = { img: Math.random() }
    fromErrorStub.mockReturnValue(img)
    await readImage('/foo/bar/image.png')
    expect(fromErrorStub.mock.calls[0]?.[0]).toBe('E_NO_TRAVERSE')
  })
  it('should return FORBIDDEN status when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    fromErrorStub.mockReturnValue({})
    await readImage('/foo/bar/image.png')
    expect(fromErrorStub.mock.calls[0]?.[1]).toBe(StatusCodes.FORBIDDEN)
  })
  it('should not read file when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    fromErrorStub.mockReturnValue({})
    await readImage('/foo/bar/image.png')
    expect(readFileStub.mock.calls.length).toBe(0)
  })

  describe('with valid image (.gif)', () => {
    const img = cast<ImageData>({ img: Math.random() })
    const data = Buffer.from('SOME DATA HERE')
    let result: ImageData = cast<ImageData>({})
    beforeEach(async () => {
      fromImageStub.mockReturnValue(img)
      readFileStub.mockResolvedValue(data)
      result = await readImage('/foo/bar/image.gif')
    })
    it('should read file', () => {
      expect(readFileStub.mock.calls.length).toBe(1)
    })
    it('should read file with expected path', () => {
      expect(readFileStub.mock.calls[0]).toEqual(['/data/foo/bar/image.gif'])
    })
    it('should resolve to parsed ImageData', () => {
      expect(result).toBe(img)
    })
    it('should construct ImageData result using ImageData.fromImage', () => {
      expect(fromImageStub.mock.calls.length).toBe(1)
    })
    it('should call fromImage with expected buffered data', () => {
      expect(fromImageStub.mock.calls[0]?.[0]).toBe(data)
    })
    it('should call fromImage with expected extension', () => {
      expect(fromImageStub.mock.calls[0]?.[1]).toBe('gif')
    })
    it('should call fromImage with expected path', () => {
      expect(fromImageStub.mock.calls[0]?.[2]).toBe('/foo/bar/image.gif')
    })
  })

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff', 'bmp', 'jfif', 'jpe']
  allowedExtensions.forEach((ext) => {
    it(`should allow .${ext}`, async () => {
      const img = { img: Math.random() }
      fromImageStub.mockReturnValue(img)
      const result = await readImage(`/foo/bar/image.${ext}`)
      expect(result).toBe(img)
    })
  })
  it('should allow dotfile with valid image extension', async () => {
    const img = { img: Math.random() }
    fromImageStub.mockReturnValue(img)
    const result = await readImage('/foo/.hidden.jpg')
    expect(result).toBe(img)
  })

  it('should join DATA_DIR with the requested path when DATA_DIR is set', async () => {
    process.env.DATA_DIR = '/library/images'
    try {
      readFileStub.mockResolvedValue(Buffer.from('SOME DATA HERE'))
      fromImageStub.mockReturnValue(cast<ImageData>({}))
      await readImage('/foo/bar/image.gif')
      expect(readFileStub.mock.calls[0]?.[0]).toBe('/library/images/foo/bar/image.gif')
    } finally {
      delete process.env.DATA_DIR
    }
  })

  describe('logging', () => {
    it('should log path-traversal-blocked format when isPathTraversal returns true', async () => {
      isPathTraversalStub.mockReturnValue(true)
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.mock.calls[0]?.[0]).toBe('path traversal blocked: %s')
    })

    it('should log the blocked path when isPathTraversal returns true', async () => {
      isPathTraversalStub.mockReturnValue(true)
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo/bar/image.png')
    })

    it('should log not-an-image format when extension is not allowed', async () => {
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.exe')
      expect(loggerStub.mock.calls[0]?.[0]).toBe('not an image: ext=%s for %s')
    })

    it('should log the disallowed extension when extension is not allowed', async () => {
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.exe')
      expect(loggerStub.mock.calls[0]?.[1]).toBe('exe')
    })

    it('should log the path when extension is not allowed', async () => {
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.exe')
      expect(loggerStub.mock.calls[0]?.[2]).toBe('/foo/bar/image.exe')
    })

    it('should log image-not-found format when readFile rejects', async () => {
      readFileStub.mockRejectedValue(new Error('disk failure'))
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.mock.calls[0]?.[0]).toBe('image not found: %s (%s)')
    })

    it('should log the missing path when readFile rejects', async () => {
      readFileStub.mockRejectedValue(new Error('disk failure'))
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo/bar/image.png')
    })

    it('should log the underlying error message when readFile rejects with Error', async () => {
      readFileStub.mockRejectedValue(new Error('disk failure'))
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.mock.calls[0]?.[2]).toBe('disk failure')
    })

    it('should log a string fallback when readFile rejects with a non-Error', async () => {
      readFileStub.mockImplementation(async () => {
        await Promise.resolve()
        throw cast<Error>({ toString: () => 'rejection-token' })
      })
      fromErrorStub.mockReturnValue({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.mock.calls[0]?.[2]).toBe('rejection-token')
    })

    it('should not log when readFile resolves and image is valid', async () => {
      const img = { img: Math.random() }
      fromImageStub.mockReturnValue(img)
      readFileStub.mockResolvedValue(Buffer.from('data'))
      await readImage('/foo/bar/image.png')
      expect(loggerStub.mock.calls.length).toBe(0)
    })
  })
})
