'use sanity'

import { Subscribe, AddInterval } from './pubsub'

export interface WakeLockSentinel {
  released: boolean
  release: () => Promise<void>
}

export class WakeLock {
  public static sentinel: WakeLockSentinel|null = null
  public static timeout: number = 0
  public static readonly wakeTime = 2 * 60 * 1000
  public static Init () {
    Subscribe('Picture:LoadNew', () => this.TakeLock())
    AddInterval('WakeLock:Release', () => this.ReleaseLock(), 30 * 1000)
  }

  public static async TakeLock () {
    try {
      if (!this.sentinel || this.sentinel.released) {
        this.sentinel = await navigator.wakeLock.request('screen')
      }
      this.timeout = Date.now() + this.wakeTime
    } catch {
      this.sentinel = null
      this.timeout = 0
    }
  }

  public static async ReleaseLock () {
    if (!this.sentinel || this.timeout > Date.now()) return
    this.timeout = 0
    try {
      if (!this.sentinel.released) {
        await this.sentinel.release()
      }
    } catch {}
    this.sentinel = null
  }
}
