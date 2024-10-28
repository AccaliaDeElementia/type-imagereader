'use sanity'

type UpdateFn = () => Promise<any>
export class CyclicUpdater {
  protected countdown: number = -1
  protected failCount: number = 0
  protected maxFails: number = 10
  period: number = 60 * 1000
  updateFn: UpdateFn = async () => await Promise.reject(new Error('Cyclic Updater Called with No Updater'))

  constructor (updateFn?: UpdateFn, period?: number) {
    this.updateFn = updateFn ?? this.updateFn
    this.period = period ?? this.period
  }

  async trigger (elapsed: number): Promise<void> {
    this.countdown -= elapsed
    if (this.countdown <= 0) {
      this.countdown = Infinity
      try {
        await this.updateFn()
        this.countdown = this.period
        this.failCount = 0
      } catch (e) {
        window.console.error('CyclicUpdater update resulted in error:', e)
        this.failCount = Math.min(this.maxFails, this.failCount + 1)
        this.countdown = Math.pow(2, this.failCount) * this.period
      }
    }
  }

  static create (updateFn: UpdateFn, period: number): CyclicUpdater {
    return new CyclicUpdater(updateFn, period)
  }
}

export class CyclicManager {
  protected static updaters: CyclicUpdater[] = []
  protected static timer: any // It's a timer...
  static Add (...updaters: CyclicUpdater[]): void {
    this.updaters.push(...updaters)
  }

  static Start (interval: number): void {
    this.timer = setInterval(
      () => { this.updaters.forEach(updater => { updater.trigger(interval).catch(() => {}) }) },
      interval
    )
  }

  static Stop (): void {
    if (this.timer != null) {
      clearInterval(this.timer as number)
      this.timer = undefined
    }
  }
}
