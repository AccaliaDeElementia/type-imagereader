'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'
import { Imports, Functions, ImageData } from '#routes/images'
import { StatusCodes } from 'http-status-codes'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'

const sandbox = Sinon.createSandbox()

describe('routes/images function ReadImage()', () => {
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
    sandbox.stub(Imports, 'logger').value(Cast<Debugger>(loggerStub))
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
  rejectors.forEach(([title, path, errorCode, statusCode, message, readFileResult]) => {
    it(`should reject ${title} with error ImageData`, async () => {
      configureReadFile(readFileStub, readFileResult)
      const img = { img: Math.random() }
      fromErrorStub.returns(img)
      const result = await Functions.ReadImage(path)
      expect(result).to.equal(img)
    })
    it(`should call ImageData.fromError once for ${title}`, async () => {
      configureReadFile(readFileStub, readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.callCount).to.equal(1)
    })
    it(`should call ImageData.fromError with 4 arguments for ${title}`, async () => {
      configureReadFile(readFileStub, readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args).to.have.lengthOf(4)
    })
    it(`should reject ${title} with with expected error code`, async () => {
      configureReadFile(readFileStub, readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[0]).to.equal(errorCode)
    })
    it(`should reject ${title} with with expected statuscode`, async () => {
      configureReadFile(readFileStub, readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[1]).to.equal(statusCode)
    })
    it(`should reject ${title} with with expected error message`, async () => {
      configureReadFile(readFileStub, readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[2]).to.equal(message)
    })
    it(`should reject ${title} with with expected path`, async () => {
      configureReadFile(readFileStub, readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[3]).to.equal(path)
    })
  })
  it('should call isPathTraversal with the path', async () => {
    await Functions.ReadImage('/foo/bar/image.png')
    expect(isPathTraversalStub.firstCall.args).to.deep.equal(['/foo/bar/image.png'])
  })
  it('should return E_NO_TRAVERSE error when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    const img = { img: Math.random() }
    fromErrorStub.returns(img)
    await Functions.ReadImage('/foo/bar/image.png')
    expect(fromErrorStub.firstCall.args[0]).to.equal('E_NO_TRAVERSE')
  })
  it('should return FORBIDDEN status when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    fromErrorStub.returns({})
    await Functions.ReadImage('/foo/bar/image.png')
    expect(fromErrorStub.firstCall.args[1]).to.equal(StatusCodes.FORBIDDEN)
  })
  it('should not read file when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    fromErrorStub.returns({})
    await Functions.ReadImage('/foo/bar/image.png')
    expect(readFileStub.callCount).to.equal(0)
  })
  const validImagetests: Array<[string, (i: ImageData, d: ImageData, buff: Buffer) => void]> = [
    [
      'read file',
      () => {
        expect(readFileStub.callCount).to.equal(1)
      },
    ],
    [
      'read file with expected path',
      () => {
        expect(readFileStub.firstCall.args).to.deep.equal(['/data/foo/bar/image.gif'])
      },
    ],
    [
      'resolve to  parsed ImageData',
      (expected, result) => {
        expect(result).to.equal(expected)
      },
    ],
    [
      'construct ImageData result using ImageData.fromImage',
      () => {
        expect(fromImageStub.callCount).to.equal(1)
      },
    ],
    [
      'call fromImage with expected buffered data',
      (_, __, data) => {
        expect(fromImageStub.firstCall.args[0]).to.equal(data)
      },
    ],
    [
      'call fromImage with expected extension',
      () => {
        expect(fromImageStub.firstCall.args[1]).to.equal('gif')
      },
    ],
    [
      'call fromImage with expected path',
      () => {
        expect(fromImageStub.firstCall.args[2]).to.equal('/foo/bar/image.gif')
      },
    ],
  ]
  validImagetests.forEach(([title, validatefn]) => {
    it(`should ${title} for valid image`, async () => {
      const img = Cast<ImageData>({ img: Math.random() })
      const data = Buffer.from('SOME DATA HERE')
      fromImageStub.returns(img)
      readFileStub.resolves(data)
      const result = await Functions.ReadImage('/foo/bar/image.gif')
      validatefn(img, result, data)
    })
  })
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff', 'bmp', 'jfif', 'jpe']
  allowedExtensions.forEach((ext) => {
    it(`should allow .${ext}`, async () => {
      const img = { img: Math.random() }
      fromImageStub.returns(img)
      const result = await Functions.ReadImage(`/foo/bar/image.${ext}`)
      expect(result).to.equal(img)
    })
  })
  it('should allow dotfile with valid image extension', async () => {
    const img = { img: Math.random() }
    fromImageStub.returns(img)
    const result = await Functions.ReadImage('/foo/.hidden.jpg')
    expect(result).to.equal(img)
  })

  describe('logging', () => {
    it('should log path-traversal-blocked format when isPathTraversal returns true', async () => {
      isPathTraversalStub.returns(true)
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[0]).to.equal('path traversal blocked: %s')
    })

    it('should log the blocked path when isPathTraversal returns true', async () => {
      isPathTraversalStub.returns(true)
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[1]).to.equal('/foo/bar/image.png')
    })

    it('should log not-an-image format when extension is not allowed', async () => {
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.exe')
      expect(loggerStub.firstCall.args[0]).to.equal('not an image: ext=%s for %s')
    })

    it('should log the disallowed extension when extension is not allowed', async () => {
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.exe')
      expect(loggerStub.firstCall.args[1]).to.equal('exe')
    })

    it('should log the path when extension is not allowed', async () => {
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.exe')
      expect(loggerStub.firstCall.args[2]).to.equal('/foo/bar/image.exe')
    })

    it('should log image-not-found format when readFile rejects', async () => {
      readFileStub.rejects(new Error('disk failure'))
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[0]).to.equal('image not found: %s (%s)')
    })

    it('should log the missing path when readFile rejects', async () => {
      readFileStub.rejects(new Error('disk failure'))
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[1]).to.equal('/foo/bar/image.png')
    })

    it('should log the underlying error message when readFile rejects with Error', async () => {
      readFileStub.rejects(new Error('disk failure'))
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[2]).to.equal('disk failure')
    })

    it('should log a string fallback when readFile rejects with a non-Error', async () => {
      readFileStub.callsFake(async () => {
        await Promise.resolve()
        throw Cast<Error>({ toString: () => 'rejection-token' })
      })
      fromErrorStub.returns({})
      await Functions.ReadImage('/foo/bar/image.png')
      expect(loggerStub.firstCall.args[2]).to.equal('rejection-token')
    })

    it('should not log when readFile resolves and image is valid', async () => {
      const img = { img: Math.random() }
      fromImageStub.returns(img)
      readFileStub.resolves(Buffer.from('data'))
      await Functions.ReadImage('/foo/bar/image.png')
      expect(loggerStub.callCount).to.equal(0)
    })
  })
})
