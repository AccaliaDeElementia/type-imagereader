'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/images'
import Sinon from 'sinon'
describe('routes/images function ReadAndRescaleImage()', () => {
  let readImageStub = Sinon.stub()
  let rescaleImageStub = Sinon.stub()
  beforeEach(() => {
    readImageStub = Sinon.stub(Functions, 'ReadImage').resolves()
    rescaleImageStub = Sinon.stub(Functions, 'RescaleImage').resolves()
  })
  afterEach(() => {
    rescaleImageStub.restore()
    readImageStub.restore()
  })
  it('should read image as requested', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 999, 999)
    expect(readImageStub.callCount).to.equal(1)
    expect(readImageStub.firstCall.args).to.deep.equal(['/foo.png'])
  })
  it('should rescale image as read', async () => {
    const img = Math.random()
    readImageStub.resolves(img)
    const width = Math.random()
    const height = Math.random()
    await Functions.ReadAndRescaleImage('/foo.png', width, height, true)
    expect(rescaleImageStub.callCount).to.equal(1)
    expect(rescaleImageStub.firstCall.args).to.deep.equal([img, width, height, true])
  })
  it('should default enable animated image support', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99)
    expect(rescaleImageStub.callCount).to.equal(1)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(true)
  })
  it('should enable animated image support explicitly', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, true)
    expect(rescaleImageStub.callCount).to.equal(1)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(true)
  })
  it('should disable animated image support explicitly', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, false)
    expect(rescaleImageStub.callCount).to.equal(1)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(false)
  })
})
