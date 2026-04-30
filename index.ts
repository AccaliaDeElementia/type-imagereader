'use sanity'

// force reading from .env before any imports fire
import 'dotenv/config'

import debug from 'debug'

import synchronize from './utils/syncfolders'
import { Functions as IncrementalSyncFunctions } from './utils/incrementalsync'
import startWatcher from './utils/filewatcher'
import type { Changeset, WatcherSubscription } from './utils/filewatcher'
import persistance from './utils/persistance'
import start from './Server'
import { StringIsNullOrEmpty } from './utils/helpers'

export const Imports = {
  logger: debug('type-imagereader:sync'),
  startWatcher,
  persistance,
  IncrementalSyncFunctions,
}

const THREE_HOURS = 10_800_000
const TWENTY_FOUR_HOURS = 86_400_000
const DEFAULT_PORT = 3030
const MINIMUM_PORT = 0
const MAXIMUM_PORT = 65535
const ZERO = 0
const EXIT_FAILURE = 1

const runIfNotSuppressed = async (skipVar: string, fn: () => Promise<void>): Promise<void> => {
  const envvar = `${process.env[skipVar]}`.toLocaleUpperCase()
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
  RunSyncWithLock: async (): Promise<void> => {
    if (!ImageReader.SyncLock.Take()) return
    try {
      await ImageReader.Synchronize()
    } finally {
      ImageReader.SyncLock.Release()
    }
  },
}

export async function RunSync(): Promise<void> {
  const promise = Functions.RunSyncWithLock()
  ImageReader.Interval = Functions.setInterval(async () => {
    try {
      await Functions.RunSyncWithLock()
    } catch (err) {
      Imports.logger('sync interval error', err)
    }
  }, ImageReader.SyncInterval)
  await promise.catch((err: unknown) => {
    Imports.logger('initial sync error', err)
  })
}

const isSuppressed = (skipVar: string): boolean => {
  const envvar = `${process.env[skipVar]}`.toLocaleUpperCase()
  return envvar === '1' || envvar === 'TRUE'
}

const parseSyncInterval = (): number | undefined => {
  const raw = process.env.SYNC_INTERVAL
  if (StringIsNullOrEmpty(raw)) return undefined
  const parsed = Number(raw)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed <= ZERO) return undefined
  return parsed
}

export const ImageReader = {
  StartServer: start,
  Synchronize: synchronize,
  Interval: undefined as number | NodeJS.Timeout | undefined,
  WatcherSubscription: undefined as WatcherSubscription | undefined,
  SyncLock: new LockResource(),
  SyncInterval: THREE_HOURS,
  WatcherEnabled: false,
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
      if (isSuppressed('ONESHOT')) {
        try {
          await ImageReader.Synchronize()
        } finally {
          try {
            const knex = await Imports.persistance.initialize()
            await knex.destroy()
          } catch (err: unknown) {
            Imports.logger('failed to release knex pool in oneshot mode', err)
          }
        }
        return
      }
      const watcherSuppressed = isSuppressed('DISABLE_WATCHER')
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
      if (!watcherSuppressed) {
        try {
          const onFlush = async (changeset: Changeset): Promise<void> => {
            if (!ImageReader.SyncLock.Take()) throw new Error('sync locked')
            try {
              const knex = await Imports.persistance.initialize()
              await Imports.IncrementalSyncFunctions.IncrementalSync(knex, changeset)
            } finally {
              ImageReader.SyncLock.Release()
            }
          }
          ImageReader.WatcherSubscription = await Imports.startWatcher('/data', onFlush)
          ImageReader.WatcherEnabled = true
        } catch (err: unknown) {
          Imports.logger('watcher start failed, falling back to polling only', err)
        }
      }
      const customInterval = parseSyncInterval()
      ImageReader.SyncInterval = customInterval ?? (ImageReader.WatcherEnabled ? TWENTY_FOUR_HOURS : THREE_HOURS)
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
/* c8 ignore next 6 */
if (require.main === module) {
  ImageReader.Run().catch((err: unknown) => {
    Imports.logger('startup failed', err)
    process.exitCode = EXIT_FAILURE
  })
}
