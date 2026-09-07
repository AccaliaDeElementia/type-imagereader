'use sanity'

import { subscribe as _subscribe, addInterval as _addInterval } from './pubsub.js'

export const Imports = {
  subscribe: _subscribe,
  addInterval: _addInterval,
}

export interface WakeLockSentinel {
  released: boolean
  release: () => Promise<void>
}

const RELEASED_TIMEOUT = 0
const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const LOCK_HOLD_MINUTES = 2
const LOCK_RELEASE_CHECK_SECONDS = 30
const LOCK_HOLD_MS = LOCK_HOLD_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND
const LOCK_RELEASE_CHECK_INTERVAL_MS = LOCK_RELEASE_CHECK_SECONDS * MS_PER_SECOND

export const WakeLock = {
  sentinel: null as WakeLockSentinel | null,
  pending: null as Promise<WakeLockSentinel> | null,
  timeout: RELEASED_TIMEOUT,
  wakeTime: LOCK_HOLD_MS,
  initialized: false,
}

export function init(): void {
  if (WakeLock.initialized) return
  WakeLock.initialized = true
  Imports.subscribe('Picture:LoadNew', async () => {
    await Internals.takeLock().catch(() => null)
  })
  Imports.addInterval(
    'WakeLock:Release',
    () => {
      Internals.releaseLock().catch(() => null)
    },
    LOCK_RELEASE_CHECK_INTERVAL_MS,
  )
}

export async function takeLock(): Promise<void> {
  try {
    if (WakeLock.sentinel === null || WakeLock.sentinel.released) {
      WakeLock.pending ??= navigator.wakeLock.request('screen')
      try {
        const lock = await WakeLock.pending
        // eslint-disable-next-line require-atomic-updates -- concurrent callers share `pending` and converge on the same lock
        WakeLock.sentinel = lock
      } finally {
        // eslint-disable-next-line require-atomic-updates -- always clear the in-flight handle once consumed; concurrent peers idempotently re-null
        WakeLock.pending = null
      }
    }
    WakeLock.timeout = Date.now() + WakeLock.wakeTime
  } catch {
    // eslint-disable-next-line require-atomic-updates -- catch only runs when the lock acquisition rejected, so there's no concurrent winner to clobber
    WakeLock.sentinel = null
    // eslint-disable-next-line require-atomic-updates -- catch only runs on rejection; reset the timeout to released
    WakeLock.timeout = RELEASED_TIMEOUT
  }
}

function clearSentinelUnlessReplacedDuringRelease(released: WakeLockSentinel): void {
  if (WakeLock.sentinel === released) WakeLock.sentinel = null
}

export async function releaseLock(): Promise<void> {
  if (WakeLock.timeout > Date.now()) return
  WakeLock.timeout = RELEASED_TIMEOUT
  const { sentinel } = WakeLock
  if (sentinel === null) return
  try {
    if (!sentinel.released) {
      await sentinel.release()
    }
  } catch {}
  clearSentinelUnlessReplacedDuringRelease(sentinel)
}

export const Internals = {
  takeLock,
  releaseLock,
}
