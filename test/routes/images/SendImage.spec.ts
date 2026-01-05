'use sanity'

import { expect } from 'chai'
import { Functions, ImageData } from '../../../routes/images'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'
import type { Response } from 'express'
describe('routes/images function ReadAndRescaleImage()', () => {
  let responseStub = {
    status: Sinon.stub().returnsThis(),
    json: Sinon.stub().returnsThis(),
    set: Sinon.stub().returnsThis(),
    send: Sinon.stub().returnsThis(),
  }
  let responseFake = Cast<Response>(responseStub)
  beforeEach(() => {
    responseStub = {
      status: Sinon.stub().returnsThis(),
      json: Sinon.stub().returnsThis(),
      set: Sinon.stub().returnsThis(),
      send: Sinon.stub().returnsThis(),
    }
    responseFake = Cast<Response>(responseStub)
  })
  it('should set content-type for valid image', () => {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, responseFake)
    expect(responseStub.set.calledWith('Content-Type', 'image/webp')).to.equal(true)
  })
  it('should set cacheControl for valid image', () => {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, responseFake)
    expect(responseStub.set.calledWith('Cache-Control', 'public, max-age=2592000000')).to.equal(true)
  })
  it('should set Expires for valid image', () => {
    const aMonth = 1000 * 60 * 60 * 24 * 30
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, responseFake)
    expect(responseStub.set.calledWith('Expires', new Date(Date.now() + aMonth).toUTCString())).to.equal(true)
  })
  it('should send image data for valid image', () => {
    const data = Buffer.from('Image Data')
    const img = ImageData.fromImage(data, 'webp', '/image.png')
    Functions.SendImage(img, responseFake)
    expect(responseStub.send.callCount).to.equal(1)
    expect(responseStub.send.firstCall.args).to.have.lengthOf(1)
    expect(responseStub.send.firstCall.args[0]).to.equal(data)
  })
  it('should not set status code explicitly', () => {
    Functions.SendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), responseFake)
    expect(responseStub.status.callCount).to.equal(0)
  })
  it('should not send json data', () => {
    Functions.SendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), responseFake)
    expect(responseStub.json.callCount).to.equal(0)
  })
  it('should not set headers for invalid image', () => {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.set.callCount).to.equal(0)
  })
  it('should not send data for invalid image', () => {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.send.callCount).to.equal(0)
  })
  it('should set http status for invalid image', () => {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([418])
  })
  it('should send json data for invalid image', () => {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.json.callCount).to.equal(1)
    expect(responseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_TEST_ERROR',
          message: 'A Test Error',
          path: '/image.png',
        },
      },
    ])
  })
})
