'use sanity'

import { catchLog } from '#utils/promises.js'
import { stubInjectedLogger } from '#testutils/debug.js'

describe('utils/promises catchLog()', () => {
  it('should not call logger when the promise resolves', async () => {
    const { stub, fake } = stubInjectedLogger()
    await catchLog(Promise.resolve(undefined), fake, 'test message')
    expect(stub).not.toHaveBeenCalled()
  })
  it('should call logger when the promise rejects', async () => {
    const { stub, fake } = stubInjectedLogger()
    await catchLog(Promise.reject(new Error('boom')), fake, 'test message')
    expect(stub).toHaveBeenCalled()
  })
  it('should pass the message as the first argument when rejecting', async () => {
    const { stub, fake } = stubInjectedLogger()
    await catchLog(Promise.reject(new Error('boom')), fake, 'test message')
    expect(stub.mock.calls[0]?.[0]).toBe('test message')
  })
  it('should pass the error as the second argument when rejecting', async () => {
    const err = new Error('boom')
    const { stub, fake } = stubInjectedLogger()
    await catchLog(Promise.reject(err), fake, 'test message')
    expect(stub.mock.calls[0]?.[1]).toBe(err)
  })
  it('should resolve rather than reject when the promise rejects', async () => {
    const promise = catchLog(Promise.reject(new Error('boom')), stubInjectedLogger().fake, 'test message')
    await expect(promise).resolves.toBeUndefined()
  })
})
