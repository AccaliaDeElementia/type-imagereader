'use sanity'

import { subscribe as _subscribe } from '@parcel/watcher'
import _debug from 'debug'
import { extname, relative, sep, posix } from 'node:path'

const DEFAULT_DEBOUNCE_MS = 5000
const DEFAULT_MAX_PENDING = 500
const ZERO = 0
const allowedExtensions = /^\.(?:jpg|jpeg|png|webp|gif|svg|tif|tiff|bmp|jfif|jpe)$/iv

export type ChangeType = 'create' | 'delete' | 'dir-create' | 'dir-delete'
export type Changeset = Map<string, ChangeType>
export type FlushCallback = (changeset: Changeset) => Promise<void>

export interface WatcherSubscription {
  unsubscribe: () => Promise<void>
}

export interface WatcherEvent {
  type: 'create' | 'update' | 'delete'
  path: string
}

export const Imports = {
  logPrefix: 'type-imagereader:sync:filewatcher',
  debug: _debug,
  subscribe: _subscribe,
  setTimeout: globalThis.setTimeout as (fn: () => void, ms: number) => ReturnType<typeof setTimeout>,
  clearTimeout: globalThis.clearTimeout as (id: ReturnType<typeof setTimeout>) => void,
}

export const Filewatcher = {
  debounceMs: DEFAULT_DEBOUNCE_MS,
  maxPendingChanges: DEFAULT_MAX_PENDING,
}

export function isImagePath(filePath: string): boolean {
  return allowedExtensions.test(extname(filePath))
}

export function isHiddenPath(relativePath: string): boolean {
  return relativePath.split(posix.sep).some((part) => part.startsWith('.'))
}

export function toRelativePath(dataDir: string, absolutePath: string): string {
  const rel = relative(dataDir, absolutePath).split(sep).join(posix.sep)
  return `/${rel}`
}

export function isDirPath(filePath: string): boolean {
  return extname(filePath) === ''
}

export function processEvents(dataDir: string, events: WatcherEvent[], changeset: Changeset): void {
  for (const event of events) {
    if (event.type === 'update') continue
    const relPath = toRelativePath(dataDir, event.path)
    if (isHiddenPath(relPath)) continue
    if (isImagePath(relPath)) {
      changeset.set(relPath, event.type === 'create' ? 'create' : 'delete')
    } else if (isDirPath(relPath)) {
      const dirPath = `${relPath}/`
      changeset.set(dirPath, event.type === 'create' ? 'dir-create' : 'dir-delete')
    }
  }
}

export async function Start(dataDir: string, onFlush: FlushCallback): Promise<WatcherSubscription> {
  const logger = Imports.debug(Imports.logPrefix)
  const changeset: Changeset = new Map()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let flushInProgress = false
  const flush = async (): Promise<void> => {
    debounceTimer = null
    flushInProgress = true
    try {
      if (changeset.size === ZERO) return
      const batch: Changeset = new Map(changeset)
      try {
        await onFlush(batch)
        for (const [key, value] of batch) {
          // Only drop the entry if a concurrent event hasn't re-set it during the flush
          if (changeset.get(key) === value) changeset.delete(key)
        }
        logger(`Flushed ${batch.size} changes`)
      } catch (err) {
        logger('Flush deferred, will retry', err)
        scheduleRetry()
      }
    } finally {
      flushInProgress = false
    }
  }

  const scheduleRetry = (): void => {
    if (debounceTimer !== null) {
      Imports.clearTimeout(debounceTimer)
    }
    debounceTimer = Imports.setTimeout(() => {
      flush().catch((err: unknown) => {
        logger('flush error', err)
      })
    }, Filewatcher.debounceMs)
  }

  const scheduleFlush = (): void => {
    if (changeset.size >= Filewatcher.maxPendingChanges && !flushInProgress) {
      if (debounceTimer !== null) {
        Imports.clearTimeout(debounceTimer)
        debounceTimer = null
      }
      flush().catch((err: unknown) => {
        logger('flush error', err)
      })
      return
    }
    if (debounceTimer !== null) {
      Imports.clearTimeout(debounceTimer)
    }
    debounceTimer = Imports.setTimeout(() => {
      flush().catch((err: unknown) => {
        logger('flush error', err)
      })
    }, Filewatcher.debounceMs)
  }

  const subscription = await Imports.subscribe(dataDir, (err, events) => {
    if (err !== null) {
      logger('watcher error', err)
      return
    }
    processEvents(dataDir, events, changeset)
    if (changeset.size > ZERO) {
      scheduleFlush()
    }
  })

  logger('File watcher started on', dataDir)
  return subscription
}
