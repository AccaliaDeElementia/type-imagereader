'use sanity'

import debug from 'debug'
const logger = debug('type-imagereader:debounce')

type DebounceCallback = () => Promise<void>

const MINIMUM_CYCLES = 1
const DEFAULT_INTERVAL = 100

const ZERO = 0
const ONE = 1

interface DebounceCounter {
  key: string
  callback: DebounceCallback
  counter: number
}

export class Debouncer {
  public _cycleCount = MINIMUM_CYCLES
  public _counters: DebounceCounter[] = []
  public constructor(timeoutMs = DEFAULT_INTERVAL) {
    this._cycleCount = Math.max(Math.ceil(timeoutMs / Debouncer._interval), MINIMUM_CYCLES)
    Debouncer._debouncers.push(this)
  }
  debounce(key: string, callback: DebounceCallback): void {
    const counter = this._counters.find((c) => c.key === key)
    if (counter === undefined) {
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
  public static _interval = DEFAULT_INTERVAL
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
    const callbacksDue: DebounceCounter[] = []
    for (const debouncer of this._debouncers.flat()) {
      callbacksDue.push(...debouncer._counters.filter((counter) => counter.counter === ZERO))
      debouncer._counters = debouncer._counters.filter((counter) => counter.counter > ZERO)
      for (const counter of debouncer._counters) {
        counter.counter -= ONE
      }
    }
    await Promise.all(
      callbacksDue.map(async ({ key, callback }) => {
        await callback().catch((err: unknown) => {
          logger(`DebounceCallback for ${key} failed`, err)
        })
      }),
    )
  }
  public static remove(debouncer: Debouncer): void {
    this._debouncers = this._debouncers.filter((bouncer) => bouncer !== debouncer)
  }
}
