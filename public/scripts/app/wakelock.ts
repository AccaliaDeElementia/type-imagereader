'use sanity'

import { Subscribe, AddInterval } from './pubsub'

export interface WakeLockSentinel {
  released: boolean
  release: () => Promise<void>
}

const RELEASED_TIMEOUT = 0
const LOCK_HOLD_TIME = 120_000 // two minutes
const LOCK_RELEASE_CHECK_INTERVAL = 30_000 //thirty seconds
export const WakeLock = {
  sentinel: null as WakeLockSentinel | null,
  pending: null as Promise<WakeLockSentinel> | null,
  timeout: RELEASED_TIMEOUT,
  wakeTime: LOCK_HOLD_TIME,
  initialized: false,
  Init: (): void => {
    if (WakeLock.initialized) return
    WakeLock.initialized = true
    Subscribe('Picture:LoadNew', async () => {
      await WakeLock.TakeLock().catch(() => null)
    })
    AddInterval(
      'WakeLock:Release',
      () => {
        WakeLock.ReleaseLock().catch(() => null)
      },
      LOCK_RELEASE_CHECK_INTERVAL,
    )
  },
  TakeLock: async (): Promise<void> => {
    try {
      if (WakeLock.sentinel === null || WakeLock.sentinel.released) {
        // Coalesce concurrent callers onto a single request so we don't orphan a lock
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
  },
  ReleaseLock: async (): Promise<void> => {
    if (WakeLock.timeout > Date.now()) return
    WakeLock.timeout = RELEASED_TIMEOUT
    const sentinel = WakeLock.sentinel
    if (sentinel === null) return
    try {
      if (!sentinel.released) {
        await sentinel.release()
      }
    } catch {}
    // Only clear if a concurrent TakeLock hasn't already installed a fresh sentinel
    if (WakeLock.sentinel === sentinel) WakeLock.sentinel = null
  },
}
