'use sanity'

import { expect, assert } from 'chai'
import { cast } from './typeGuards.js'

export async function eventuallyRejects(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (e: unknown) {
    if (e instanceof Error) return e
    if (typeof e === 'string') return new Error(e)
    return new Error(`An error of type ${typeof e} was rejected!`)
  }
  expect.fail('eventuallyRejects did not reject!')
}

export function doesNotThrow(func: () => void): void {
  func()
}

export async function eventuallyFulfills(promise: Promise<unknown>): Promise<void> {
  await promise
}

export function definitelyThrows(fn: () => unknown): Error {
  try {
    fn()
  } catch (e: unknown) {
    if (e instanceof Error) return e
    if (typeof e === 'string') return new Error(e)
    return new Error(`An error of type ${typeof e} was thrown!`)
  }
  expect.fail('definitelyThrows did not throw!')
}

export function alwaysFails<T>(message = 'Assertion Failed', _: T | null = null): T {
  return cast<T>(() => assert.fail(message))
}
