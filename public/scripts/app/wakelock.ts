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
  Init: (): void => {
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
        WakeLock.sentinel = await navigator.wakeLock.request('screen')
      }
      WakeLock.timeout = Date.now() + WakeLock.wakeTime
    } catch {
      WakeLock.sentinel = null
      WakeLock.timeout = RELEASED_TIMEOUT
    }
  },
  ReleaseLock: async (): Promise<void> => {
    if (WakeLock.sentinel === null || WakeLock.timeout > Date.now()) return
    WakeLock.timeout = RELEASED_TIMEOUT
    try {
      if (!WakeLock.sentinel.released) {
        await WakeLock.sentinel.release()
      }
    } catch {}
    WakeLock.sentinel = null
  },
}
