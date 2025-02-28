'use sanity'

import { Subscribe, AddInterval } from './pubsub'

export interface WakeLockSentinel {
  released: boolean
  release: () => Promise<void>
}

export const WakeLock = {
  sentinel: ((): WakeLockSentinel | null => null)(),
  timeout: 0,
  wakeTime: 2 * 60 * 1000,
  Init: (): void => {
    Subscribe('Picture:LoadNew', () => {
      WakeLock.TakeLock().catch(() => null)
    })
    AddInterval(
      'WakeLock:Release',
      () => {
        WakeLock.ReleaseLock().catch(() => null)
      },
      30 * 1000,
    )
  },
  TakeLock: async (): Promise<void> => {
    try {
      if (WakeLock.sentinel == null || WakeLock.sentinel.released) {
        WakeLock.sentinel = await navigator.wakeLock.request('screen')
      }
      WakeLock.timeout = Date.now() + WakeLock.wakeTime
    } catch {
      WakeLock.sentinel = null
      WakeLock.timeout = 0
    }
  },
  ReleaseLock: async (): Promise<void> => {
    if (WakeLock.sentinel == null || WakeLock.timeout > Date.now()) return
    WakeLock.timeout = 0
    try {
      if (!WakeLock.sentinel.released) {
        await WakeLock.sentinel.release()
      }
    } catch {}
    WakeLock.sentinel = null
  },
}
