'use sanity'

type UpdateFn = () => Promise<void>
export async function defaultUpdateFn(): Promise<void> {
  await Promise.reject(new Error('Cyclic Updater Called with No Updater'))
}
const INCREMENT = 1
const COUNTDOWN_EXPIRES_AT = 0
const DEFAULT_COUNTDOWN_VALUE = -1
const DEFAULT_UPDATE_PERIOD = 60_000
const MINIMUM_COUNTDOWN = 0
const RESET_FAIL_COUNT = 0
const MAX_FAIL_COUNT = 10
const UPDATER_BACKOFF_MULTIPLE = 2
export class CyclicUpdater {
  _countdown = DEFAULT_COUNTDOWN_VALUE
  _failCount = RESET_FAIL_COUNT
  _maxFails = MAX_FAIL_COUNT
  period = DEFAULT_UPDATE_PERIOD
  updateFn = defaultUpdateFn

  constructor(updateFn?: UpdateFn, period?: number) {
    this.updateFn = updateFn ?? this.updateFn
    if (typeof period === 'number' && period > MINIMUM_COUNTDOWN) {
      this.period = period
    }
  }

  async trigger(elapsed: number): Promise<void> {
    this._countdown -= elapsed
    if (this._countdown <= COUNTDOWN_EXPIRES_AT) {
      this._countdown = Infinity
      try {
        await this.updateFn()
        this._countdown = this.period
        this._failCount = RESET_FAIL_COUNT
      } catch (e) {
        window.console.error('CyclicUpdater update resulted in error:', e)
        this._failCount = Math.min(this._maxFails, this._failCount + INCREMENT)
        this._countdown = UPDATER_BACKOFF_MULTIPLE ** this._failCount * this.period
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
    if (CyclicManager.__timer !== undefined) {
      clearInterval(CyclicManager.__timer)
      CyclicManager.__timer = undefined
    }
  },
}
