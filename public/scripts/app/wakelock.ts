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
  sentinel: ((): WakeLockSentinel | null => null)(),
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
        const lock = await navigator.wakeLock.request('screen')
        // eslint-disable-next-line require-atomic-updates -- sentinel is intentionally set to the newly acquired lock
        WakeLock.sentinel = lock
      }
      WakeLock.timeout = Date.now() + WakeLock.wakeTime
    } catch {
      WakeLock.sentinel = null
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
    // eslint-disable-next-line require-atomic-updates -- sentinel is intentionally nulled after the lock is released
    WakeLock.sentinel = null
  },
}
