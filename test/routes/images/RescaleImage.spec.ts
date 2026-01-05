'use sanity'

import { assert, expect } from 'chai'
import { Imports, Functions, ImageData } from '../../../routes/images'
import Sharp from 'sharp'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'
describe('routes/images function ReadImage()', () => {
  let sharpInstanceStub = {
    rotate: Sinon.stub().returnsThis(),
    resize: Sinon.stub().returnsThis(),
    webp: Sinon.stub().returnsThis(),
    toBuffer: Sinon.stub().resolves(),
  }
  let sharpStub = Sinon.stub()
  beforeEach(() => {
    sharpStub = Sinon.stub(Imports, 'Sharp').returns(Cast<Sharp.Sharp>(sharpInstanceStub))
  })
  afterEach(() => {
    sharpInstanceStub = {
      rotate: Sinon.stub().returnsThis(),
      resize: Sinon.stub().returnsThis(),
      webp: Sinon.stub().returnsThis(),
      toBuffer: Sinon.stub().resolves(),
    }
    sharpStub.restore()
  })
  it('should abort when error already detected', async () => {
    const img = new ImageData()
    img.code = 'FOO'
    await Functions.RescaleImage(img, 1280, 720)
    expect(sharpStub.callCount).to.equal(0)
  })
  interface SharpResizeArgs {
    width: unknown
    height: unknown
    fit: unknown
    withoutEnlargement: unknown
  }
  const getSharpArgs = (): SharpResizeArgs => Cast<SharpResizeArgs>(sharpInstanceStub.resize.firstCall.args[0])
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
      await Functions.RescaleImage(img, 1280, 720, animated)
      validation(data, img)
    })
  })
  it('should output as buffer', async () => {
    const img = new ImageData()
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    sharpInstanceStub.toBuffer.resolves(data)
    await Functions.RescaleImage(img, 1280, 720)
    expect(img.data).to.equal(data)
  })
  it('ignore error when sharp throws', async () => {
    const img = new ImageData()
    sharpStub.throws(new Error('OOPS'))
    await Functions.RescaleImage(img, 1280, 720)
    expect(img.code).to.equal(null)
    assert.isNaN(img.statusCode)
    expect(img.message).to.equal(null)
  })
  it('should ignore sharp rejection', async () => {
    const img = new ImageData()
    sharpInstanceStub.toBuffer.rejects(new Error('OOPS'))
    await Functions.RescaleImage(img, 1280, 720)
    expect(img.code).to.equal(null)
    assert.isNaN(img.statusCode)
    expect(img.message).to.equal(null)
  })
})
