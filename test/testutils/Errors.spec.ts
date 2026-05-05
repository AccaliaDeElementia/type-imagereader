'use sanity'

import { expect } from 'chai'

import {
  AlwaysFails,
  DefinitelyThrows,
  DoesNotThrow,
  EventuallyFullfills,
  EventuallyRejects,
} from '#testutils/Errors.js'

describe('testutils/Errors function EventuallyRejects()', () => {
  it('should return the Error when promise rejects with an Error', async () => {
    const err = new Error('test error')
    const result = await EventuallyRejects(Promise.reject<unknown>(err))
    expect(result).to.equal(err)
  })
  it('should return an Error when promise rejects with a string', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- testing non-Error rejection handling
    const result = await EventuallyRejects(Promise.reject<unknown>('oops'))
    expect(result).to.be.instanceOf(Error)
  })
  it('should set the string as the message when promise rejects with a string', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- testing non-Error rejection handling
    const result = await EventuallyRejects(Promise.reject<unknown>('oops'))
    expect(result.message).to.equal('oops')
  })
  it('should return an Error when promise rejects with a non-Error non-string', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- testing non-Error rejection handling
    const result = await EventuallyRejects(Promise.reject<unknown>(42))
    expect(result).to.be.instanceOf(Error)
  })
  it('should include the type in the message when promise rejects with a non-Error non-string', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- testing non-Error rejection handling
    const result = await EventuallyRejects(Promise.reject<unknown>(42))
    expect(result.message).to.include('number')
  })
  it('should throw an assertion error when the promise resolves', async () => {
    let threw = false
    try {
      await EventuallyRejects(Promise.resolve())
    } catch (_) {
      threw = true
    }
    expect(threw).to.equal(true)
  })
})

describe('testutils/Errors function DoesNotThrow()', () => {
  it('should call the function without throwing', () => {
    let called = false
    DoesNotThrow(() => {
      called = true
    })
    expect(called).to.equal(true)
  })
})

describe('testutils/Errors function EventuallyFullfills()', () => {
  it('should resolve when the promise fulfills', async () => {
    await EventuallyFullfills(Promise.resolve())
  })
})

describe('testutils/Errors function DefinitelyThrows()', () => {
  it('should return the Error when the function throws an Error', () => {
    const err = new Error('test')
    const result = DefinitelyThrows(() => {
      throw err
    })
    expect(result).to.equal(err)
  })
  it('should return an Error when the function throws a string', () => {
    const result = DefinitelyThrows(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- testing the string-throw branch of DefinitelyThrows
      throw 'oops'
    })
    expect(result).to.be.instanceOf(Error)
  })
  it('should set the string as the message when the function throws a string', () => {
    const result = DefinitelyThrows(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- testing the string-throw branch of DefinitelyThrows
      throw 'oops'
    })
    expect(result.message).to.equal('oops')
  })
  it('should return an Error when the function throws a non-Error non-string', () => {
    const result = DefinitelyThrows(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- testing the non-Error non-string branch of DefinitelyThrows
      throw 42
    })
    expect(result).to.be.instanceOf(Error)
  })
  it('should include the type in the message when the function throws a non-Error non-string', () => {
    const result = DefinitelyThrows(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- testing the non-Error non-string branch of DefinitelyThrows
      throw 42
    })
    expect(result.message).to.include('number')
  })
  it('should throw an assertion error when the function does not throw', () => {
    let threw = false
    try {
      DefinitelyThrows(() => undefined)
    } catch (_) {
      threw = true
    }
    expect(threw).to.equal(true)
  })
})

describe('testutils/Errors function AlwaysFails()', () => {
  it('should produce a callable that throws an assertion error when invoked', () => {
    expect(AlwaysFails<() => void>('failure message')).to.throw()
  })

  it('should default to "Assertion Failed" when no message argument is provided', () => {
    expect(AlwaysFails<() => void>()).to.throw('Assertion Failed')
  })
})
