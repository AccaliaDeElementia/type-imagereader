'use sanity'

import Sinon from 'sinon'

import { findStubCall } from '#testutils/sinon.js'

const sandbox = Sinon.createSandbox()

describe('testutils findStubCall()', () => {
  afterEach(() => {
    sandbox.restore()
  })
  it('should return undefined when the stub has not been called', () => {
    const stub = sandbox.stub()
    expect(findStubCall(stub, () => true)).toBe(undefined)
  })
  it('should return undefined when no calls match the predicate', () => {
    const stub = sandbox.stub()
    stub('hello')
    stub('world')
    expect(findStubCall(stub, (args) => args[0] === 'nope')).toBe(undefined)
  })
  it('should return the matching call when one matches', () => {
    const stub = sandbox.stub()
    stub('first')
    stub('target')
    stub('third')
    expect(findStubCall(stub, (args) => args[0] === 'target')?.args[0]).toBe('target')
  })
  it('should return the first matching call when multiple match', () => {
    const stub = sandbox.stub()
    stub('match', 1)
    stub('match', 2)
    stub('match', 3)
    expect(findStubCall(stub, (args) => args[0] === 'match')?.args[1]).toBe(1)
  })
  it('should pass the call args array to the predicate', () => {
    const stub = sandbox.stub()
    stub('a', 'b', 'c')
    let received: unknown[] | undefined = undefined
    findStubCall(stub, (args) => {
      received = args
      return false
    })
    expect(received).toEqual(['a', 'b', 'c'])
  })
  it('should return a SpyCall whose args match the original invocation', () => {
    const stub = sandbox.stub()
    stub('only', 42, { x: 1 })
    expect(findStubCall(stub, () => true)?.args).toEqual(['only', 42, { x: 1 }])
  })
})
