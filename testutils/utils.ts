'use sanity'

import { promisify } from 'node:util'

export async function delay(ms: number): Promise<void> {
  await promisify((cb) => {
    setTimeout(() => {
      cb(null, null)
    }, ms)
  })()
}
