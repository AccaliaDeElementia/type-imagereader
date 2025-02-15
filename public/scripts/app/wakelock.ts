'use sanity'

import { Subscribe, AddInterval } from './pubsub'

export interface WakeLockSentinel {
  released: boolean
  release: () => Promise<void>
}

export class WakeLock {
  public static sentinel: WakeLockSentinel | null = null
  public static timeout = 0
  public static readonly wakeTime = 2 * 60 * 1000
  public static Init(): void {
    Subscribe('Picture:LoadNew', () => {
      this.TakeLock().catch(() => null)
    })
    AddInterval(
      'WakeLock:Release',
      () => {
        this.ReleaseLock().catch(() => null)
      },
      30 * 1000,
    )
  }

  public static async TakeLock(): Promise<void> {
    try {
      if (this.sentinel == null || this.sentinel.released) {
        this.sentinel = await navigator.wakeLock.request('screen')
      }
      this.timeout = Date.now() + this.wakeTime
    } catch {
      this.sentinel = null
      this.timeout = 0
    }
  }

  public static async ReleaseLock(): Promise<void> {
    if (this.sentinel == null || this.timeout > Date.now()) return
    this.timeout = 0
    try {
      if (!this.sentinel.released) {
        await this.sentinel.release()
      }
    } catch {}
    this.sentinel = null
  }
}
