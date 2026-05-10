'use sanity'

import Sinon from 'sinon'

import { delay } from '#testutils/utils.js'

const sandbox = Sinon.createSandbox()

describe('testutils delay()', () => {
  let clock: sinon.SinonFakeTimers | undefined = undefined

  beforeEach(() => {
    clock = sandbox.useFakeTimers()
  })
  afterEach(() => {
    sandbox.restore()
  })

  it('should not resolve before the specified delay elapses', async () => {
    let resolved = false
    const promise = delay(100).then(() => {
      resolved = true
    })
    await clock?.tickAsync(99)
    expect(resolved).toBe(false)
    await clock?.tickAsync(1)
    await promise
    expect(resolved).toBe(true)
  })
  it('should resolve after the specified delay elapses', async () => {
    let resolved = false
    const promise = delay(100).then(() => {
      resolved = true
    })
    await clock?.tickAsync(100)
    await promise
    expect(resolved).toBe(true)
  })
})
