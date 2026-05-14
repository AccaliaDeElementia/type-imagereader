'use sanity'

import { findStubCall } from '#testutils/mocks.js'

describe('testutils findStubCall()', () => {
  it('should return undefined when the stub has not been called', () => {
    const stub = vi.fn()
    expect(findStubCall(stub, () => true)).toBe(undefined)
  })
  it('should return undefined when no calls match the predicate', () => {
    const stub = vi.fn()
    stub('hello')
    stub('world')
    expect(findStubCall(stub, (args) => args[0] === 'nope')).toBe(undefined)
  })
  it('should return the matching call when one matches', () => {
    const stub = vi.fn()
    stub('first')
    stub('target')
    stub('third')
    expect(findStubCall(stub, (args) => args[0] === 'target')?.[0]).toBe('target')
  })
  it('should return the first matching call when multiple match', () => {
    const stub = vi.fn()
    stub('match', 1)
    stub('match', 2)
    stub('match', 3)
    expect(findStubCall(stub, (args) => args[0] === 'match')?.[1]).toBe(1)
  })
  it('should pass the call args array to the predicate', () => {
    const stub = vi.fn()
    stub('a', 'b', 'c')
    let received: readonly unknown[] | undefined = undefined
    findStubCall(stub, (args) => {
      received = args
      return false
    })
    expect(received).toEqual(['a', 'b', 'c'])
  })
  it('should return a SpyCall whose args match the original invocation', () => {
    const stub = vi.fn()
    stub('only', 42, { x: 1 })
    expect(findStubCall(stub, () => true)).toEqual(['only', 42, { x: 1 }])
  })
})
