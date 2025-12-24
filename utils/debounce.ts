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
  protected cycleCount: number
  protected counters: DebounceCounter[] = []

  protected constructor(timeoutMs = 100) {
    this.cycleCount = Math.max(Math.ceil(timeoutMs / Debouncer.interval), 1)
  }

  debounce(key: string, callback: DebounceCallback): void {
    const counter = this.counters.find((c) => c.key === key)
    if (counter == null) {
      this.counters.push({
        key,
        callback,
        counter: this.cycleCount,
      })
    } else {
      counter.counter = this.cycleCount
      counter.callback = callback
    }
  }

  protected static debouncers: Debouncer[] = []
  protected static timer?: ReturnType<typeof setInterval>
  protected static interval = 100

  protected static getDebouncers(): Debouncer[] {
    return this.debouncers
  }

  public static startTimers(): void {
    this.timer ??= setInterval(() => {
      this.doCycle()
    }, this.interval)
  }

  public static stopTimers(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  protected static doCycle(): void {
    this.getDebouncers().forEach((debouncer) => {
      const callbacksDue = debouncer.counters.filter((counter) => counter.counter === 0)
      debouncer.counters = debouncer.counters.filter((counter) => counter.counter > 0)
      debouncer.counters.forEach((counter) => {
        counter.counter--
      })
      callbacksDue.forEach(({ key, callback }) => {
        callback().catch((err: unknown) => {
          logger(`DebounceCallback for ${key} failed`, err)
        })
      })
    })
  }

  public static create(timeoutMs = 100): Debouncer {
    const result = new Debouncer(timeoutMs)
    this.debouncers.push(result)
    return result
  }

  public static remove(debouncer: Debouncer): void {
    this.debouncers = this.debouncers.filter((bouncer) => bouncer !== debouncer)
  }
}
