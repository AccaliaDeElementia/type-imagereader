'use sanity'

import { sendImage, ImageData } from '#routes/images.js'
import { createResponseFake } from '#testutils/express.js'

const FROZEN_NOW = Date.UTC(2026, 0, 15, 12, 0, 0)
const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30
const MILLISECONDS_PER_SECOND = 1000

const IMAGE_PATH = '/image.png'
const IMAGE_EXTENSION = 'webp'
const ERROR_CODE = 'E_TEST_ERROR'
const ERROR_STATUS = 418
const ERROR_MESSAGE = 'A Test Error'

const expectedHeaders = [
  ['Content-Type', `image/${IMAGE_EXTENSION}`],
  ['Cache-Control', 'public, max-age=2592000'],
  ['Expires', new Date(FROZEN_NOW + ONE_MONTH_MS).toUTCString()],
]

describe('routes/images sendImage()', () => {
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const sendValidImage = (data: Buffer = Buffer.from('')): void => {
    sendImage(ImageData.fromImage(data, IMAGE_EXTENSION, IMAGE_PATH), responseFake)
  }
  const sendErroredImage = (): void => {
    sendImage(ImageData.fromError(ERROR_CODE, ERROR_STATUS, ERROR_MESSAGE, IMAGE_PATH), responseFake)
  }

  describe('for a valid image', () => {
    it('should set the content-type, cache-control and expires headers', () => {
      sendValidImage()
      expect(responseStub.set.mock.calls).toEqual(expectedHeaders)
    })
    it('should set Expires to the same instant that Cache-Control max-age describes', () => {
      const headerValue = (name: string): string =>
        String(responseStub.set.mock.calls.find((call) => call[0] === name)?.[1])
      sendValidImage()
      const maxAgeSeconds = Number(/max-age=(?<seconds>\d+)/v.exec(headerValue('Cache-Control'))?.groups?.seconds)
      expect(Date.parse(headerValue('Expires'))).toBe(FROZEN_NOW + maxAgeSeconds * MILLISECONDS_PER_SECOND)
    })
    it('should send the image bytes exactly once', () => {
      const data = Buffer.from('Image Data')
      sendValidImage(data)
      expect(responseStub.send.mock.calls).toEqual([[data]])
    })
    it('should neither set a status nor send json', () => {
      sendValidImage()
      expect({ status: responseStub.status.mock.calls, json: responseStub.json.mock.calls }).toEqual({
        status: [],
        json: [],
      })
    })
  })

  describe('for an invalid image', () => {
    it('should neither set headers nor send bytes', () => {
      sendErroredImage()
      expect({ set: responseStub.set.mock.calls, send: responseStub.send.mock.calls }).toEqual({ set: [], send: [] })
    })
    it("should set the error's http status exactly once", () => {
      sendErroredImage()
      expect(responseStub.status.mock.calls).toEqual([[ERROR_STATUS]])
    })
    it('should send the error body as json exactly once', () => {
      sendErroredImage()
      expect(responseStub.json.mock.calls).toEqual([
        [{ error: { code: ERROR_CODE, message: ERROR_MESSAGE, path: IMAGE_PATH } }],
      ])
    })
  })
})
