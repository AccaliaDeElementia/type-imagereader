import { expect, assert } from 'chai'
import { Cast } from './TypeGuards'

export async function EventuallyRejects(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (e: unknown) {
    if (e instanceof Error) return e
    if (typeof e === 'string') return new Error(e)
    return new Error(`An error of type ${typeof e} was rejected!`)
  }
  expect.fail('EventuallyRejects did not reject!')
}

export async function EventuallyFullfills(promise: Promise<unknown>): Promise<void> {
  await promise
}

export function DefinitelyThrows(fn: () => unknown): Error {
  try {
    fn()
  } catch (e: unknown) {
    if (e instanceof Error) return e
    if (typeof e === 'string') return new Error(e)
    return new Error(`An error of type ${typeof e} was thrown!`)
  }
  expect.fail('DefinitelyThrows did not throw!')
}

export function AlwaysFails<T>(message = 'Assertion Failed', _: T | null = null): T {
  return Cast<T>(() => assert.fail(message))
}
