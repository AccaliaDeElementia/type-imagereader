'use sanity'

type UpdateFn = () => Promise<void>
const defaultUpdateFn: UpdateFn = async () => {
  await Promise.reject(new Error('Cyclic Updater Called with No Updater'))
}
export class CyclicUpdater {
  protected countdown = -1
  protected failCount = 0
  protected maxFails = 10
  period = 60 * 1000
  updateFn = defaultUpdateFn

  constructor(updateFn?: UpdateFn, period?: number) {
    this.updateFn = updateFn ?? this.updateFn
    this.period = period ?? this.period
  }

  async trigger(elapsed: number): Promise<void> {
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

  static create(updateFn: UpdateFn, period: number): CyclicUpdater {
    return new CyclicUpdater(updateFn, period)
  }
}

export const CyclicManager = {
  updaters: ((): CyclicUpdater[] => [])(),
  timer: ((): NodeJS.Timeout | number | undefined => undefined)(),
  Add: (...updaters: CyclicUpdater[]): void => {
    CyclicManager.updaters.push(...updaters)
  },
  Start: (interval: number): void => {
    CyclicManager.timer = setInterval(() => {
      CyclicManager.updaters.forEach((updater) => {
        updater.trigger(interval).catch(() => null)
      })
    }, interval)
  },
  Stop: (): void => {
    if (CyclicManager.timer != null) {
      clearInterval(CyclicManager.timer)
      CyclicManager.timer = undefined
    }
  },
}
