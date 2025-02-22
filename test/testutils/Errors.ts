import { expect } from 'chai'

export async function RejectString(message: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- testing rejecting non error
  await Promise.reject(message)
}

export async function EventuallyRejects(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (e: unknown) {
    if (e instanceof Error) return e
    if (typeof e === 'string') return new Error(e)
    return new Error(`An error of type ${typeof e} was rejected`)
  }
  expect.fail('EventuallyRejects did not reject!')
}
