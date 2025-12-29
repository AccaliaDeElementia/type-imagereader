'use sanity'

import debug from 'debug'
const logger = debug('type-imagereader:debounce')

type DebounceCallback = () => Promise<void>

interface DebounceCounter {
  key: string
  callback: DebounceCallback
  counter: number
}

export class Debouncer {
  public _cycleCount = 1
  public _counters: DebounceCounter[] = []
  public constructor(timeoutMs = 100) {
    this._cycleCount = Math.max(Math.ceil(timeoutMs / Debouncer._interval), 1)
    Debouncer._debouncers.push(this)
  }
  debounce(key: string, callback: DebounceCallback): void {
    const counter = this._counters.find((c) => c.key === key)
    if (counter == null) {
      this._counters.push({
        key,
        callback,
        counter: this._cycleCount,
      })
    } else {
      counter.counter = this._cycleCount
      counter.callback = callback
    }
  }
  public static _debouncers: Debouncer[] = []
  public static _timer?: ReturnType<typeof setInterval>
  public static _interval = 100
  public static startTimers(): void {
    this._timer ??= setInterval(() => {
      void this._doCycle()
    }, this._interval)
  }
  public static stopTimers(): void {
    if (this._timer !== undefined) {
      clearInterval(this._timer)
      this._timer = undefined
    }
  }
  public static async _doCycle(): Promise<void> {
    await Promise.all(
      this._debouncers.flatMap(async (debouncer) => {
        const callbacksDue = debouncer._counters.filter((counter) => counter.counter === 0)
        debouncer._counters = debouncer._counters.filter((counter) => counter.counter > 0)
        debouncer._counters.forEach((counter) => {
          counter.counter--
        })
        await Promise.all(
          callbacksDue.map(async ({ key, callback }) => {
            await callback().catch((err: unknown) => {
              logger(`DebounceCallback for ${key} failed`, err)
            })
          }),
        )
      }),
    )
  }
  public static remove(debouncer: Debouncer): void {
    this._debouncers = this._debouncers.filter((bouncer) => bouncer !== debouncer)
  }
}
