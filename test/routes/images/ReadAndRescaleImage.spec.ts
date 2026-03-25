'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/images'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()
describe('routes/images function ReadAndRescaleImage()', () => {
  let readImageStub = Sinon.stub()
  let rescaleImageStub = Sinon.stub()
  beforeEach(() => {
    readImageStub = sandbox.stub(Functions, 'ReadImage').resolves()
    rescaleImageStub = sandbox.stub(Functions, 'RescaleImage').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call ReadImage once', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 999, 999)
    expect(readImageStub.callCount).to.equal(1)
  })
  it('should read image as requested', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 999, 999)
    expect(readImageStub.firstCall.args).to.deep.equal(['/foo.png'])
  })
  it('should call RescaleImage once when rescaling', async () => {
    const img = Math.random()
    readImageStub.resolves(img)
    const width = Math.random()
    const height = Math.random()
    await Functions.ReadAndRescaleImage('/foo.png', width, height, true)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should rescale image as read', async () => {
    const img = Math.random()
    readImageStub.resolves(img)
    const width = Math.random()
    const height = Math.random()
    await Functions.ReadAndRescaleImage('/foo.png', width, height, true)
    expect(rescaleImageStub.firstCall.args).to.deep.equal([img, width, height, true])
  })
  it('should call RescaleImage once with default animated support', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should default enable animated image support', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(true)
  })
  it('should call RescaleImage once when enabling animated support explicitly', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, true)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should enable animated image support explicitly', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, true)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(true)
  })
  it('should call RescaleImage once when disabling animated support explicitly', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, false)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should disable animated image support explicitly', async () => {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, false)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(false)
  })
})
