'use sanity'

import { expect } from 'chai'
import { Imports, Functions, ImageData } from '../../../routes/images'
import { StatusCodes } from 'http-status-codes'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/images function ReadImage()', () => {
  let fromErrorStub = Sinon.stub()
  let fromImageStub = Sinon.stub()
  let readFileStub = Sinon.stub()
  beforeEach(() => {
    fromErrorStub = Sinon.stub(ImageData, 'fromError')
    fromImageStub = Sinon.stub(ImageData, 'fromImage')
    readFileStub = Sinon.stub(Imports, 'readFile').resolves()
  })
  afterEach(() => {
    fromErrorStub.restore()
    fromImageStub.restore()
    readFileStub.restore()
  })
  const rejectors: Array<[string, string, string, number, string, Promise<unknown>]> = [
    [
      'directory traversal',
      '/foo/../bar/image.png',
      'E_NO_TRAVERSE',
      StatusCodes.FORBIDDEN,
      'Directory Traversal is not Allowed!',
      Promise.resolve(),
    ],
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
      Promise.reject(new Error('FOO NOT FOUND')),
    ],
  ]
  rejectors.forEach(([title, path, errorCode, statusCode, message, readFileResult]) => {
    it(`should reject ${title} with error ImageData`, async () => {
      readFileStub.returns(readFileResult)
      const img = { img: Math.random() }
      fromErrorStub.returns(img)
      const result = await Functions.ReadImage(path)
      expect(result).to.equal(img)
    })
    it(`should reject ${title} with using ImageData.fromError`, async () => {
      readFileStub.returns(readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.callCount).to.equal(1)
      expect(fromErrorStub.firstCall.args).to.have.lengthOf(4)
    })
    it(`should reject ${title} with with expected error code`, async () => {
      readFileStub.returns(readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[0]).to.equal(errorCode)
    })
    it(`should reject ${title} with with expected statuscode`, async () => {
      readFileStub.returns(readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[1]).to.equal(statusCode)
    })
    it(`should reject ${title} with with expected error message`, async () => {
      readFileStub.returns(readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[2]).to.equal(message)
    })
    it(`should reject ${title} with with expected path`, async () => {
      readFileStub.returns(readFileResult)
      await Functions.ReadImage(path)
      expect(fromErrorStub.firstCall.args[3]).to.equal(path)
    })
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
})
