'use sanity'

import type { Debugger } from 'debug'
import { Imports, readImage, ImageData } from '#routes/images.js'
import { StatusCodes } from 'http-status-codes'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

describe('routes/images readImage()', () => {
  let fromErrorStub = sandbox.stub()
  let fromImageStub = sandbox.stub()
  let readFileStub = sandbox.stub()
  let isPathTraversalStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  beforeEach(() => {
    fromErrorStub = sandbox.stub(ImageData, 'fromError')
    fromImageStub = sandbox.stub(ImageData, 'fromImage')
    readFileStub = sandbox.stub(Imports, 'readFile').resolves()
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'logger').value(cast<Debugger>(loggerStub))
  })
  afterEach(() => {
    sandbox.restore()
  })
  const configureReadFile = (stub: Sinon.SinonStub, result: Promise<unknown> | Error): void => {
    if (result instanceof Error) {
      stub.rejects(result)
    } else {
      stub.returns(result)
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
        fromErrorStub.returns(img)
        result = await readImage(path)
      })
      it('should reject with error ImageData', () => {
        expect(result).toBe(img)
      })
      it('should call ImageData.fromError once', () => {
        expect(fromErrorStub.callCount).toBe(1)
      })
      it('should call ImageData.fromError with 4 arguments', () => {
        expect(fromErrorStub.firstCall.args).toHaveLength(4)
      })
      it('should reject with expected error code', () => {
        expect(fromErrorStub.firstCall.args[0]).toBe(errorCode)
      })
      it('should reject with expected status code', () => {
        expect(fromErrorStub.firstCall.args[1]).toBe(statusCode)
      })
      it('should reject with expected error message', () => {
        expect(fromErrorStub.firstCall.args[2]).toBe(message)
      })
      it('should reject with expected path', () => {
        expect(fromErrorStub.firstCall.args[3]).toBe(path)
      })
    })
  })

  it('should call isPathTraversal with the path', async () => {
    await readImage('/foo/bar/image.png')
    expect(isPathTraversalStub.firstCall.args).toEqual(['/foo/bar/image.png'])
  })
  it('should return E_NO_TRAVERSE error when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    const img = { img: Math.random() }
    fromErrorStub.returns(img)
    await readImage('/foo/bar/image.png')
    expect(fromErrorStub.firstCall.args[0]).toBe('E_NO_TRAVERSE')
  })
  it('should return FORBIDDEN status when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    fromErrorStub.returns({})
    await readImage('/foo/bar/image.png')
    expect(fromErrorStub.firstCall.args[1]).toBe(StatusCodes.FORBIDDEN)
  })
  it('should not read file when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    fromErrorStub.returns({})
    await readImage('/foo/bar/image.png')
    expect(readFileStub.callCount).toBe(0)
  })

  describe('with valid image (.gif)', () => {
    const img = cast<ImageData>({ img: Math.random() })
    const data = Buffer.from('SOME DATA HERE')
    let result: ImageData = cast<ImageData>({})
    beforeEach(async () => {
      fromImageStub.returns(img)
      readFileStub.resolves(data)
      result = await readImage('/foo/bar/image.gif')
    })
    it('should read file', () => {
      expect(readFileStub.callCount).toBe(1)
    })
    it('should read file with expected path', () => {
      expect(readFileStub.firstCall.args).toEqual(['/data/foo/bar/image.gif'])
    })
    it('should resolve to parsed ImageData', () => {
      expect(result).toBe(img)
    })
    it('should construct ImageData result using ImageData.fromImage', () => {
      expect(fromImageStub.callCount).toBe(1)
    })
    it('should call fromImage with expected buffered data', () => {
      expect(fromImageStub.firstCall.args[0]).toBe(data)
    })
    it('should call fromImage with expected extension', () => {
      expect(fromImageStub.firstCall.args[1]).toBe('gif')
    })
    it('should call fromImage with expected path', () => {
      expect(fromImageStub.firstCall.args[2]).toBe('/foo/bar/image.gif')
    })
  })

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff', 'bmp', 'jfif', 'jpe']
  allowedExtensions.forEach((ext) => {
    it(`should allow .${ext}`, async () => {
      const img = { img: Math.random() }
      fromImageStub.returns(img)
      const result = await readImage(`/foo/bar/image.${ext}`)
      expect(result).toBe(img)
    })
  })
  it('should allow dotfile with valid image extension', async () => {
    const img = { img: Math.random() }
    fromImageStub.returns(img)
    const result = await readImage('/foo/.hidden.jpg')
    expect(result).toBe(img)
  })

  it('should join DATA_DIR with the requested path when DATA_DIR is set', async () => {
    process.env.DATA_DIR = '/library/images'
    try {
      readFileStub.resolves(Buffer.from('SOME DATA HERE'))
      fromImageStub.returns(cast<ImageData>({}))
      await readImage('/foo/bar/image.gif')
      expect(readFileStub.firstCall.args[0]).toBe('/library/images/foo/bar/image.gif')
    } finally {
      delete process.env.DATA_DIR
    }
  })

  describe('logging', () => {
    it('should log path-traversal-blocked format when isPathTraversal returns true', async () => {
      isPathTraversalStub.returns(true)
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[0]).toBe('path traversal blocked: %s')
    })

    it('should log the blocked path when isPathTraversal returns true', async () => {
      isPathTraversalStub.returns(true)
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[1]).toBe('/foo/bar/image.png')
    })

    it('should log not-an-image format when extension is not allowed', async () => {
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.exe')
      expect(loggerStub.firstCall.args[0]).toBe('not an image: ext=%s for %s')
    })

    it('should log the disallowed extension when extension is not allowed', async () => {
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.exe')
      expect(loggerStub.firstCall.args[1]).toBe('exe')
    })

    it('should log the path when extension is not allowed', async () => {
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.exe')
      expect(loggerStub.firstCall.args[2]).toBe('/foo/bar/image.exe')
    })

    it('should log image-not-found format when readFile rejects', async () => {
      readFileStub.rejects(new Error('disk failure'))
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[0]).toBe('image not found: %s (%s)')
    })

    it('should log the missing path when readFile rejects', async () => {
      readFileStub.rejects(new Error('disk failure'))
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[1]).toBe('/foo/bar/image.png')
    })

    it('should log the underlying error message when readFile rejects with Error', async () => {
      readFileStub.rejects(new Error('disk failure'))
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[2]).toBe('disk failure')
    })

    it('should log a string fallback when readFile rejects with a non-Error', async () => {
      readFileStub.callsFake(async () => {
        await Promise.resolve()
        throw cast<Error>({ toString: () => 'rejection-token' })
      })
      fromErrorStub.returns({})
      await readImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[2]).toBe('rejection-token')
    })

    it('should not log when readFile resolves and image is valid', async () => {
      const img = { img: Math.random() }
      fromImageStub.returns(img)
      readFileStub.resolves(Buffer.from('data'))
      await readImage('/foo/bar/image.png')
      expect(loggerStub.callCount).toBe(0)
    })
  })
})
