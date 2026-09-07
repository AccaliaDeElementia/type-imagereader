'use sanity'

import type { Debugger } from 'debug'

export async function catchLog<T>(promise: Promise<T>, logger: Debugger, message: string): Promise<void> {
  await promise.catch((err: unknown) => {
    logger(message, err)
  })
}
