'use sanity'

// force reading from .env before any imports fire
import 'dotenv/config'

import debug from 'debug'
import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Synchronize as _Synchronize } from './sync/synchronize.js'
import { IncrementalSync as _IncrementalSync } from './sync/incrementalsync.js'
import { Start as startWatcher } from './sync/filewatcher.js'
import type { Changeset, WatcherSubscription } from './sync/filewatcher.js'
import { Initialize as _Initialize } from './utils/persistance.js'
import { Start as start } from './Server.js'
import { StringIsNullOrEmpty, getDataDir } from './utils/helpers.js'

const IncrementalSyncFunctions = { IncrementalSync: _IncrementalSync }

export const Imports = {
  logger: debug('type-imagereader:sync'),
  startWatcher,
  Initialize: _Initialize,
  IncrementalSyncFunctions,
  stat,
  getDataDir,
  setInterval: setInterval as (fn: () => Promise<void>, interval: number) => number | NodeJS.Timeout,
}

const THREE_HOURS = 10_800_000
const TWENTY_FOUR_HOURS = 86_400_000
const DEFAULT_PORT = 3030
const MINIMUM_PORT = 0
const MAXIMUM_PORT = 65535
const ZERO = 0
const EXIT_FAILURE = 1
const ENTRY_ARGV_INDEX = 1

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
  take(): boolean {
    if (this._locked) return false
    this._locked = true
    return true
  }
  release(): void {
    if (!this._locked) return
    this._locked = false
  }
}

export async function RunSyncWithLock(): Promise<void> {
  if (!ImageReader.SyncLock.take()) return
  try {
    await ImageReader.Synchronize()
  } finally {
    ImageReader.SyncLock.release()
  }
}

export async function ValidateDataDir(dataDir: string): Promise<void> {
  const stats = await Imports.stat(dataDir).catch((err: unknown) => {
    throw new Error(`DATA_DIR ${dataDir} is not accessible`, { cause: err })
  })
  if (!stats.isDirectory()) {
    throw new Error(`DATA_DIR ${dataDir} is not a directory`)
  }
}

export async function RunSync(): Promise<void> {
  const promise = Internals.RunSyncWithLock()
  ImageReader.Interval = Imports.setInterval(async () => {
    try {
      await Internals.RunSyncWithLock()
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
  Synchronize: _Synchronize,
  Interval: undefined as number | NodeJS.Timeout | undefined,
  WatcherSubscription: undefined as WatcherSubscription | undefined,
  SyncLock: new LockResource(),
  SyncInterval: THREE_HOURS,
  WatcherEnabled: false,
  Run: async (): Promise<void> => {
    const dataDir = Imports.getDataDir()
    Imports.logger('using data directory: %s', dataDir)
    await Internals.ValidateDataDir(dataDir)
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
            const knex = await Imports.Initialize()
            await knex.destroy()
          } catch (err: unknown) {
            Imports.logger('failed to release knex pool in oneshot mode', err)
          }
        }
        return
      }
      const watcherSuppressed = isSuppressed('DISABLE_WATCHER')
      const doSync = async (): Promise<void> => {
        if (!ImageReader.SyncLock.take()) return
        try {
          await ImageReader.Synchronize()
        } finally {
          ImageReader.SyncLock.release()
        }
      }
      doSync().catch((err: unknown) => {
        Imports.logger('sync error', err)
      })
      if (!watcherSuppressed) {
        try {
          const onFlush = async (changeset: Changeset): Promise<void> => {
            if (!ImageReader.SyncLock.take()) throw new Error('sync locked')
            try {
              const knex = await Imports.Initialize()
              await Imports.IncrementalSyncFunctions.IncrementalSync(knex, changeset, dataDir)
            } finally {
              ImageReader.SyncLock.release()
            }
          }
          ImageReader.WatcherSubscription = await Imports.startWatcher(dataDir, onFlush)
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

// Match argv[1] against either this file or its directory: `tsx ./index.ts` sets
// argv[1] to the file path, while `tsx .` sets it to the directory and lets Node
// resolve the entry. Both should trigger startup; tests that import this module
// (e.g., `#app.js`) leave argv[1] pointing at the test runner, so the guard stays
// false there and Run() does not fire.
const entryFile = fileURLToPath(import.meta.url)
const entryDir = dirname(entryFile)
const invokedAs = process.argv[ENTRY_ARGV_INDEX]
/* istanbul ignore next -- entry-guard branch only fires when this file is the
   process entry, never under tests (which always invoke via the test runner) */
if (invokedAs !== undefined && [entryFile, entryDir].includes(resolve(invokedAs))) {
  ImageReader.Run().catch((err: unknown) => {
    Imports.logger('startup failed', err)
    process.exitCode = EXIT_FAILURE
  })
}

export const Internals = { RunSyncWithLock, ValidateDataDir }
