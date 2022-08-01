'use sanity'

import debug from 'debug'
const logger = debug('type-imagereader:debounce')

const debounceTime = 50
const debounceCounter = 2

interface DebounceCallback {
  (): Promise<void>
}

interface DebounceCounter {
  key: string
  callback: DebounceCallback
  counter: number
}

let counters: DebounceCounter[] = []
export const getDebouncer = () => {
  const prefix = `${Math.random()}`
  return (key: string, callback: DebounceCallback) => {
    const debounceKey = `${prefix}${key}`
    const counter = counters.filter(c => c.key === debounceKey)[0]
    if (counter) {
      counter.counter = debounceCounter
      counter.callback = callback
    } else {
      counters.push({
        key: debounceKey,
        counter: debounceCounter,
        callback
      })
    }
  }
}

setInterval(() => {
  const countersDue = counters.filter(counter => counter.counter <= 0)
  counters = counters.filter(counter => counter.counter > 0)
  counters.forEach(counter => {
    counter.counter -= 1
  })
  countersDue.forEach(counter => counter.callback()
    .catch(err => logger(`DebounceCallback for ${counter.key} failed`, err))
  )
}, debounceTime)
