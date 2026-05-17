'use sanity'

import { catchLog } from '#utils/promises.js'
import { createLoggerFake } from '#testutils/debug.js'

describe('utils/promises catchLog()', () => {
  it('should not call logger when the promise resolves', async () => {
    const { stub, fake } = createLoggerFake()
    catchLog(Promise.resolve(undefined), fake, 'test message')
    await Promise.resolve()
    expect(stub).not.toHaveBeenCalled()
  })
  it('should call logger when the promise rejects', async () => {
    const { stub, fake } = createLoggerFake()
    catchLog(Promise.reject(new Error('boom')), fake, 'test message')
    await Promise.resolve()
    expect(stub).toHaveBeenCalled()
  })
  it('should pass the message as the first argument when rejecting', async () => {
    const { stub, fake } = createLoggerFake()
    catchLog(Promise.reject(new Error('boom')), fake, 'test message')
    await Promise.resolve()
    expect(stub.mock.calls[0]?.[0]).toBe('test message')
  })
  it('should pass the error as the second argument when rejecting', async () => {
    const err = new Error('boom')
    const { stub, fake } = createLoggerFake()
    catchLog(Promise.reject(err), fake, 'test message')
    await Promise.resolve()
    expect(stub.mock.calls[0]?.[1]).toBe(err)
  })
  it('should consume the rejection (no unhandled-rejection)', async () => {
    // Vitest fails tests with unhandled rejections by default. The fact that
    // this test completes cleanly demonstrates that catchLog attached the
    // rejection handler synchronously.
    catchLog(Promise.reject(new Error('boom')), createLoggerFake().fake, 'test message')
    await Promise.resolve()
    expect(true).toBe(true)
  })
})
