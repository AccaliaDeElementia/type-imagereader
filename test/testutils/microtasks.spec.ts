'use sanity'

import { flushMicrotasks } from '#testutils/microtasks.js'

describe('testutils flushMicrotasks()', () => {
  it('should drain a single pending microtask', async () => {
    let resolved = false
    void Promise.resolve().then(() => {
      resolved = true
    })
    await flushMicrotasks()
    expect(resolved).toBe(true)
  })
  it('should drain a chain of microtasks scheduled by earlier microtasks', async () => {
    // Each .then() in this chain only schedules the next one AFTER its own
    // resolution. A single `await Promise.resolve()` would FIFO-resume before
    // the chain finishes; the macrotask-yield approach drains all of them.
    let step = 0
    void Promise.resolve()
      .then(() => {
        step = 1
      })
      .then(() => {
        step = 2
      })
      .then(() => {
        step = 3
      })
      .then(() => {
        step = 4
      })
    await flushMicrotasks()
    expect(step).toBe(4)
  })
  it('should drain microtasks dynamically scheduled during draining', async () => {
    let observed = 0
    void Promise.resolve().then(() => {
      void Promise.resolve().then(() => {
        void Promise.resolve().then(() => {
          observed = 99
        })
      })
    })
    await flushMicrotasks()
    expect(observed).toBe(99)
  })
})
