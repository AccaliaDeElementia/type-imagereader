'use sanity'

// force reading from .env before any imports fire
import 'dotenv/config'

import debug from 'debug'
import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { synchronize as _synchronize } from './sync/synchronize.js'
import { incrementalSync as _incrementalSync } from './sync/incrementalsync.js'
import { start as startWatcher } from './sync/filewatcher.js'
import type { Changeset, WatcherSubscription } from './sync/filewatcher.js'
import { initialize as _initialize } from './utils/persistance.js'
import { start } from './server.js'
import { stringIsNullOrEmpty, getDataDir } from './utils/helpers.js'

const IncrementalSyncFunctions = { incrementalSync: _incrementalSync }

export const Imports = {
  logger: debug('type-imagereader:sync'),
  startWatcher,
  initialize: _initialize,
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

export async function runSyncWithLock(): Promise<void> {
  if (!ImageReader.syncLock.take()) return
  try {
    await ImageReader.synchronize()
  } finally {
    ImageReader.syncLock.release()
  }
}

export async function validateDataDir(dataDir: string): Promise<void> {
  const stats = await Imports.stat(dataDir).catch((err: unknown) => {
    throw new Error(`DATA_DIR ${dataDir} is not accessible`, { cause: err })
  })
  if (!stats.isDirectory()) {
    throw new Error(`DATA_DIR ${dataDir} is not a directory`)
  }
}

export async function runSync(): Promise<void> {
  const promise = Internals.runSyncWithLock()
  ImageReader.interval = Imports.setInterval(async () => {
    try {
      await Internals.runSyncWithLock()
    } catch (err) {
      Imports.logger('sync interval error', err)
    }
  }, ImageReader.syncInterval)
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
  if (stringIsNullOrEmpty(raw)) return undefined
  const parsed = Number(raw)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed <= ZERO) return undefined
  return parsed
}

export const ImageReader = {
  startServer: start,
  synchronize: _synchronize,
  interval: undefined as number | NodeJS.Timeout | undefined,
  watcherSubscription: undefined as WatcherSubscription | undefined,
  syncLock: new LockResource(),
  syncInterval: THREE_HOURS,
  watcherEnabled: false,
  run: async (): Promise<void> => {
    const dataDir = Imports.getDataDir()
    Imports.logger('using data directory: %s', dataDir)
    await Internals.validateDataDir(dataDir)
    await runIfNotSuppressed('SKIP_SERVE', async () => {
      const port = Number(stringIsNullOrEmpty(process.env.PORT) ? DEFAULT_PORT : process.env.PORT)
      if (Number.isNaN(port)) {
        throw new Error(`Port ${port} (from env: ${process.env.PORT}) is not a number. Valid ports must be a number.`)
      }
      if (!Number.isInteger(port)) {
        throw new Error(`Port ${port} is not integer. Valid ports must be integer between 0 and 65535.`)
      }
      if (port < MINIMUM_PORT || port > MAXIMUM_PORT) {
        throw new Error(`Port ${port} is out of range. Valid ports must be between 0 and 65535.`)
      }
      await ImageReader.startServer(port)
    })
    await runIfNotSuppressed('SKIP_SYNC', async () => {
      if (isSuppressed('ONESHOT')) {
        try {
          await ImageReader.synchronize()
        } finally {
          try {
            const knex = await Imports.initialize()
            await knex.destroy()
          } catch (err: unknown) {
            Imports.logger('failed to release knex pool in oneshot mode', err)
          }
        }
        return
      }
      const watcherSuppressed = isSuppressed('DISABLE_WATCHER')
      const doSync = async (): Promise<void> => {
        if (!ImageReader.syncLock.take()) return
        try {
          await ImageReader.synchronize()
        } finally {
          ImageReader.syncLock.release()
        }
      }
      doSync().catch((err: unknown) => {
        Imports.logger('sync error', err)
      })
      if (!watcherSuppressed) {
        try {
          const onFlush = async (changeset: Changeset): Promise<void> => {
            if (!ImageReader.syncLock.take()) throw new Error('sync locked')
            try {
              const knex = await Imports.initialize()
              await Imports.IncrementalSyncFunctions.incrementalSync(knex, changeset, dataDir)
            } finally {
              ImageReader.syncLock.release()
            }
          }
          ImageReader.watcherSubscription = await Imports.startWatcher(dataDir, onFlush)
          ImageReader.watcherEnabled = true
        } catch (err: unknown) {
          Imports.logger('watcher start failed, falling back to polling only', err)
        }
      }
      const customInterval = parseSyncInterval()
      ImageReader.syncInterval = customInterval ?? (ImageReader.watcherEnabled ? TWENTY_FOUR_HOURS : THREE_HOURS)
      ImageReader.interval = setInterval(() => {
        doSync().catch((err: unknown) => {
          Imports.logger('sync interval error', err)
        })
      }, ImageReader.syncInterval)
      await Promise.resolve()
    })
  },
}

// Match argv[1] against either this file or its directory: `tsx ./app.ts` sets
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
  ImageReader.run().catch((err: unknown) => {
    Imports.logger('startup failed', err)
    process.exitCode = EXIT_FAILURE
  })
}

export const Internals = { runSyncWithLock, validateDataDir }
