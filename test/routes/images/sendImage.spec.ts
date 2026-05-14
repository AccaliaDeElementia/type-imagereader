'use sanity'

import { sendImage, ImageData } from '#routes/images.js'
import { createResponseFake } from '#testutils/express.js'
describe('routes/images sendImage()', () => {
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  beforeEach(() => {
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  it('should set content-type for valid image', () => {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    sendImage(img, responseFake)
    expect(responseStub.set).toHaveBeenCalledWith('Content-Type', 'image/webp')
  })
  it('should set cacheControl for valid image', () => {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    sendImage(img, responseFake)
    expect(responseStub.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=2592000000')
  })
  it('should set Expires for valid image', () => {
    const aMonth = 1000 * 60 * 60 * 24 * 30
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    sendImage(img, responseFake)
    expect(responseStub.set).toHaveBeenCalledWith('Expires', new Date(Date.now() + aMonth).toUTCString())
  })
  it('should call send once for valid image', () => {
    const data = Buffer.from('Image Data')
    const img = ImageData.fromImage(data, 'webp', '/image.png')
    sendImage(img, responseFake)
    expect(responseStub.send.mock.calls.length).toBe(1)
  })
  it('should send image data with one argument for valid image', () => {
    const data = Buffer.from('Image Data')
    const img = ImageData.fromImage(data, 'webp', '/image.png')
    sendImage(img, responseFake)
    expect(responseStub.send.mock.calls[0]).toHaveLength(1)
  })
  it('should send image data for valid image', () => {
    const data = Buffer.from('Image Data')
    const img = ImageData.fromImage(data, 'webp', '/image.png')
    sendImage(img, responseFake)
    expect(responseStub.send.mock.calls[0]?.[0]).toBe(data)
  })
  it('should not set status code explicitly', () => {
    sendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), responseFake)
    expect(responseStub.status.mock.calls.length).toBe(0)
  })
  it('should not send json data', () => {
    sendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), responseFake)
    expect(responseStub.json.mock.calls.length).toBe(0)
  })
  it('should not set headers for invalid image', () => {
    sendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.set.mock.calls.length).toBe(0)
  })
  it('should not send data for invalid image', () => {
    sendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.send.mock.calls.length).toBe(0)
  })
  it('should call status once for invalid image', () => {
    sendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.status.mock.calls.length).toBe(1)
  })
  it('should set http status for invalid image', () => {
    sendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([418])
  })
  it('should call json once for invalid image', () => {
    sendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.json.mock.calls.length).toBe(1)
  })
  it('should send json data for invalid image', () => {
    sendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), responseFake)
    expect(responseStub.json.mock.calls[0]).toEqual([
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
