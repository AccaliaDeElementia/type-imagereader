'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'
import { Imports, rescaleImage, ImageData } from '#routes/images.js'
import Sharp from 'sharp'
import Sinon from 'sinon'
import { cast } from '#testutils/TypeGuards.js'

const sandbox = Sinon.createSandbox()
describe('routes/images rescaleImage()', () => {
  let sharpInstanceStub = {
    rotate: sandbox.stub().returnsThis(),
    resize: sandbox.stub().returnsThis(),
    webp: sandbox.stub().returnsThis(),
    toBuffer: sandbox.stub().resolves(),
  }
  let sharpStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  beforeEach(() => {
    sharpStub = sandbox.stub(Imports, 'Sharp').returns(cast<Sharp.Sharp>(sharpInstanceStub))
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'logger').value(cast<Debugger>(loggerStub))
  })
  afterEach(() => {
    sandbox.restore()
    sharpInstanceStub = {
      rotate: sandbox.stub().returnsThis(),
      resize: sandbox.stub().returnsThis(),
      webp: sandbox.stub().returnsThis(),
      toBuffer: sandbox.stub().resolves(),
    }
  })
  it('should abort when error already detected', async () => {
    const img = new ImageData()
    img.code = 'FOO'
    await rescaleImage(img, 1280, 720)
    expect(sharpStub.callCount).to.equal(0)
  })
  interface SharpResizeArgs {
    width: unknown
    height: unknown
    fit: unknown
    withoutEnlargement: unknown
  }
  const getSharpArgs = (): SharpResizeArgs => cast<SharpResizeArgs>(sharpInstanceStub.resize.firstCall.args[0])
  const successTests: Array<[string, boolean, (data: Buffer, img: ImageData) => void]> = [
    ['parse Sharp data', true, () => expect(sharpStub.callCount).to.equal(1)],
    ['call Sharp with expected arg count', true, () => expect(sharpStub.firstCall.args).to.have.lengthOf(2)],
    ['provide buffered data to Sharp ', true, (data) => expect(sharpStub.firstCall.args[0]).to.equal(data)],
    [
      'provide a set animated flag when animated resize requested',
      true,
      () => expect(sharpStub.firstCall.args[1]).to.deep.equal({ animated: true }),
    ],
    [
      'provide a unset animated flag when animated resize not requested',
      false,
      () => expect(sharpStub.firstCall.args[1]).to.deep.equal({ animated: false }),
    ],
    ['rotate image to canonical orientation', true, () => expect(sharpInstanceStub.rotate.callCount).to.equal(1)],
    [
      'provide no argumnets to rotate request',
      true,
      () => expect(sharpInstanceStub.rotate.firstCall.args).to.deep.equal([]),
    ],
    ['resize image', true, () => expect(sharpInstanceStub.resize.callCount).to.equal(1)],
    [
      'call resize image with config flags',
      true,
      () => expect(sharpInstanceStub.resize.firstCall.args).to.have.lengthOf(1),
    ],
    [
      'call resize image with expected set config flags',
      true,
      () => expect(getSharpArgs()).to.have.all.keys('width', 'height', 'fit', 'withoutEnlargement'),
    ],
    ['call resize image with width flag', true, () => expect(getSharpArgs().width).to.equal(1280)],
    ['call resize image with height flag', true, () => expect(getSharpArgs().height).to.equal(720)],
    ['call resize image with fit flag', true, () => expect(getSharpArgs().fit).to.equal(Sharp.fit.inside)],
    [
      'call resize image with withoutEnlargement flag',
      true,
      () => expect(getSharpArgs().withoutEnlargement).to.equal(true),
    ],
    ['convert image to webp', true, () => expect(sharpInstanceStub.webp.callCount).to.equal(1)],
    ['convert image to webp', true, (_, img) => expect(img.extension).to.equal('webp')],
    ['convert to webp with defaults', true, () => expect(sharpInstanceStub.webp.firstCall.args).to.deep.equal([])],
    ['convert resilt to Buffer', true, () => expect(sharpInstanceStub.toBuffer.callCount).to.equal(1)],
    ['convert o buffer with defaults', true, () => expect(sharpInstanceStub.toBuffer.firstCall.args).to.deep.equal([])],
  ]
  successTests.forEach(([title, animated, validation]) => {
    it(`should ${title}`, async () => {
      const data = Buffer.from(`{ image: ${Math.random()} }`)
      const img = new ImageData()
      img.data = data
      await rescaleImage(img, 1280, 720, animated)
      validation(data, img)
    })
  })
  it('should output as buffer', async () => {
    const img = new ImageData()
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    sharpInstanceStub.toBuffer.resolves(data)
    await rescaleImage(img, 1280, 720)
    expect(img.data).to.equal(data)
  })
  const failureModes: Array<[string, () => void]> = [
    ['sharp throws', () => sharpStub.throws(new Error('OOPS'))],
    ['sharp rejects', () => sharpInstanceStub.toBuffer.rejects(new Error('OOPS'))],
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
        expect(img.code).to.equal(null)
      })
      it('should not set error status code', async () => {
        await rescaleImage(img, 1280, 720)
        expect(img.statusCode).to.equal(0)
      })
      it('should not set error message', async () => {
        await rescaleImage(img, 1280, 720)
        expect(img.message).to.equal(null)
      })
      it('should not update extension', async () => {
        img.extension = 'jpg'
        await rescaleImage(img, 1280, 720)
        expect(img.extension).to.equal('jpg')
      })
      it('should not update data', async () => {
        const originalData = Buffer.from('original')
        img.data = originalData
        await rescaleImage(img, 1280, 720)
        expect(img.data).to.equal(originalData)
      })
    })
  })

  describe('failure logging', () => {
    it('should log rescale-failed format when sharp throws', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.throws(new Error('OOPS'))
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.firstCall.args[0]).to.equal('rescale failed for %s: %s')
    })

    it('should log the image path when sharp throws', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.throws(new Error('OOPS'))
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.firstCall.args[1]).to.equal('/foo/bar.jpg')
    })

    it('should log the error message when sharp throws an Error', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpStub.throws(new Error('OOPS'))
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.firstCall.args[2]).to.equal('OOPS')
    })

    it('should log a string fallback when sharp rejects with a non-Error', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      sharpInstanceStub.toBuffer.callsFake(async () => {
        await Promise.resolve()
        throw cast<Error>({ toString: () => 'rejection-token' })
      })
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.firstCall.args[2]).to.equal('rejection-token')
    })

    it('should not log on successful rescale', async () => {
      const img = new ImageData()
      img.path = '/foo/bar.jpg'
      img.data = Buffer.from('data')
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.callCount).to.equal(0)
    })

    it('should not log when image already has an error code', async () => {
      const img = new ImageData()
      img.code = 'E_PRIOR'
      sharpStub.throws(new Error('OOPS'))
      await rescaleImage(img, 1280, 720)
      expect(loggerStub.callCount).to.equal(0)
    })
  })
})
