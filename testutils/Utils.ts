import { promisify } from 'node:util'

export async function Delay(ms: number): Promise<void> {
  await promisify((cb) => {
    setTimeout(() => {
      cb(null, null)
    }, ms)
  })()
}
