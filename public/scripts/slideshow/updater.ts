'use sanity'

type UpdateFn = () => Promise<void>
export async function defaultUpdateFn(): Promise<void> {
  await Promise.reject(new Error('Cyclic Updater Called with No Updater'))
}
export class CyclicUpdater {
  _countdown = -1
  _failCount = 0
  _maxFails = 10
  period = 60 * 1000
  updateFn = defaultUpdateFn

  constructor(updateFn?: UpdateFn, period?: number) {
    this.updateFn = updateFn ?? this.updateFn
    if (typeof period === 'number' && period > 0) {
      this.period = period
    }
  }

  async trigger(elapsed: number): Promise<void> {
    this._countdown -= elapsed
    if (this._countdown <= 0) {
      this._countdown = Infinity
      try {
        await this.updateFn()
        this._countdown = this.period
        this._failCount = 0
      } catch (e) {
        window.console.error('CyclicUpdater update resulted in error:', e)
        this._failCount = Math.min(this._maxFails, this._failCount + 1)
        this._countdown = 2 ** this._failCount * this.period
      }
    }
  }
}

export const CyclicManager = {
  __updaters: ((): CyclicUpdater[] => [])(),
  __timer: ((): NodeJS.Timeout | number | undefined => undefined)(),
  __triggerUpdaters: async (interval: number): Promise<void> => {
    await Promise.all(
      CyclicManager.__updaters.map(async (updater) => {
        try {
          await updater.trigger(interval)
        } catch (_) {}
      }),
    )
  },
  Add: (...updaters: CyclicUpdater[]): void => {
    CyclicManager.__updaters.push(...updaters)
  },
  Start: (interval: number): void => {
    CyclicManager.__timer = setInterval(() => {
      CyclicManager.__triggerUpdaters(interval).catch(() => null)
    }, interval)
  },
  Stop: (): void => {
    if (CyclicManager.__timer != null) {
      clearInterval(CyclicManager.__timer)
      CyclicManager.__timer = undefined
    }
  },
}
