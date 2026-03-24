'use sanity'

// force reading from .env before any imports fire
import 'dotenv/config'

import debug from 'debug'

import synchronize from './utils/syncfolders'
import start from './Server'
import { StringIsNullOrEmpty } from './utils/helpers'

export const Imports = {
  logger: debug('type-imagereader:sync'),
}

const THREE_HOURS = 10_800_000
const DEFAULT_PORT = 3030
const MINIMUM_PORT = 0
const MAXIMUM_PORT = 65535

const runIfNotSuppressed = async (triggerVar: string, fn: () => Promise<void>): Promise<void> => {
  const envvar = `${process.env[triggerVar]}`.toLocaleUpperCase()
  if (envvar === '1' || envvar === 'TRUE') return
  await fn()
}

export class LockResource {
  _locked: boolean
  constructor() {
    this._locked = false
  }
  Take(): boolean {
    if (this._locked) return false
    this._locked = true
    return true
  }
  Release(): void {
    if (!this._locked) return
    this._locked = false
  }
}

export const Functions = {
  setInterval: setInterval as (fn: () => Promise<void>, interval: number) => number | NodeJS.Timeout,
  ActuallyRunSyncForReal: async (): Promise<void> => {
    if (!ImageReader.SyncLock.Take()) return
    try {
      await ImageReader.Synchronize()
    } finally {
      ImageReader.SyncLock.Release()
    }
  },
}

export async function RunSync(): Promise<void> {
  const promise = Functions.ActuallyRunSyncForReal()
  ImageReader.Interval = Functions.setInterval(async () => {
    try {
      await Functions.ActuallyRunSyncForReal()
    } catch (err) {
      Imports.logger('sync interval error', err)
    }
  }, ImageReader.SyncInterval)
  await promise.catch(() => null)
}

export const ImageReader = {
  StartServer: start,
  Synchronize: synchronize,
  Interval: ((): number | NodeJS.Timeout | undefined => undefined)(),
  SyncLock: new LockResource(),
  SyncInterval: THREE_HOURS,
  Run: async (): Promise<void> => {
    await runIfNotSuppressed('SKIP_SERVE', async () => {
      const port = Number(StringIsNullOrEmpty(process.env.PORT) ? DEFAULT_PORT : process.env.PORT)
      if (Number.isNaN(port)) {
        throw new Error(`Port ${port} (from env: ${process.env.PORT}) is not a number. Valid ports must be a number.`)
      }
      if (!Number.isInteger(port)) {
        throw new Error(`Port ${port} is not integer. Valid ports must be integer between 0 and 65535.`)
      }
      if (port < MINIMUM_PORT || port > MAXIMUM_PORT) {
        throw new Error(`Port ${port} is out of range. Valid ports must be between 0 and 65535.`)
      }
      await ImageReader.StartServer(port)
    })
    await runIfNotSuppressed('SKIP_SYNC', async () => {
      const doSync = async (): Promise<void> => {
        if (!ImageReader.SyncLock.Take()) return
        try {
          await ImageReader.Synchronize()
        } finally {
          ImageReader.SyncLock.Release()
        }
      }
      doSync().catch((err: unknown) => {
        Imports.logger('sync error', err)
      })
      ImageReader.Interval = setInterval(() => {
        doSync().catch((err: unknown) => {
          Imports.logger('sync interval error', err)
        })
      }, ImageReader.SyncInterval)
      await Promise.resolve()
    })
  },
}

// This is the actual main entry point of the app. we can't run it during test
// and it will be blindingly obvious if it's not run on app start so it's fine
// to ignore.
/* c8 ignore next 3 */
if (require.main === module) {
  ImageReader.Run().catch(() => null)
}
