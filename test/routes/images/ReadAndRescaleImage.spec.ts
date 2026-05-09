'use sanity'

import { expect } from 'chai'
import { readAndRescaleImage, Internals } from '#routes/images.js'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()
describe('routes/images readAndRescaleImage()', () => {
  let readImageStub = sandbox.stub()
  let rescaleImageStub = sandbox.stub()
  beforeEach(() => {
    readImageStub = sandbox.stub(Internals, 'readImage').resolves()
    rescaleImageStub = sandbox.stub(Internals, 'rescaleImage').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call readImage once', async () => {
    await readAndRescaleImage('/foo.png', 999, 999)
    expect(readImageStub.callCount).to.equal(1)
  })
  it('should read image as requested', async () => {
    await readAndRescaleImage('/foo.png', 999, 999)
    expect(readImageStub.firstCall.args).to.deep.equal(['/foo.png'])
  })
  it('should call rescaleImage once when rescaling', async () => {
    const img = Math.random()
    readImageStub.resolves(img)
    const width = Math.random()
    const height = Math.random()
    await readAndRescaleImage('/foo.png', width, height, true)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should rescale image as read', async () => {
    const img = Math.random()
    readImageStub.resolves(img)
    const width = Math.random()
    const height = Math.random()
    await readAndRescaleImage('/foo.png', width, height, true)
    expect(rescaleImageStub.firstCall.args).to.deep.equal([img, width, height, true])
  })
  it('should call rescaleImage once with default animated support', async () => {
    await readAndRescaleImage('/foo.png', 99, 99)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should default enable animated image support', async () => {
    await readAndRescaleImage('/foo.png', 99, 99)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(true)
  })
  it('should call rescaleImage once when enabling animated support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, true)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should enable animated image support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, true)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(true)
  })
  it('should call rescaleImage once when disabling animated support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, false)
    expect(rescaleImageStub.callCount).to.equal(1)
  })
  it('should disable animated image support explicitly', async () => {
    await readAndRescaleImage('/foo.png', 99, 99, false)
    expect(rescaleImageStub.firstCall.args[3]).to.equal(false)
  })
})
