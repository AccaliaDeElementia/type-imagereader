'use sanity'

import { expect } from 'chai'
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
    expect(resolved).to.equal(false)
    await clock?.tickAsync(1)
    await promise
    expect(resolved).to.equal(true)
  })
  it('should resolve after the specified delay elapses', async () => {
    let resolved = false
    const promise = delay(100).then(() => {
      resolved = true
    })
    await clock?.tickAsync(100)
    await promise
    expect(resolved).to.equal(true)
  })
})
