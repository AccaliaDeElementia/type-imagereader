// use sanity

export class CyclicUpdater {
  private countdown: number = -1
  private failCount: number = 0
  private maxFails: number = 10
  period: number = 60 * 1000
  updateFn: Function = () => console.log('Cyclic Updater Called with No Updater')
  constructor (updateFn: Function, period: number) {
    this.updateFn = updateFn
    this.period = period
  }

  async trigger (elapsed: number) {
    this.countdown -= elapsed
    if (this.countdown <= 0) {
      this.countdown = Infinity
      try {
        await this.updateFn()
        this.countdown = this.period
        this.failCount = 0
      } catch (e) {
        console.error('CyclicUpdater update resulted in error:', e)
        this.failCount = Math.min(this.maxFails, this.failCount + 1)
        this.countdown = Math.pow(2, this.failCount) * this.period
      }
    }
  }

  static create (updateFn: Function, period: number) {
    return new CyclicUpdater(updateFn, period)
  }
}

const updaters: CyclicUpdater[] = []

export const AddUpdater = (...newUpdaters: CyclicUpdater[]) => {
  newUpdaters.forEach(updater => updaters.push(updater))
}

export const StartCycling = (interval: number = 100) => {
  return setInterval(() => updaters.forEach(updater => updater.trigger(interval)), interval)
}
