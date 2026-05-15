'use sanity'

export async function eventuallyFulfills(promise: Promise<unknown>): Promise<void> {
  await promise
}
