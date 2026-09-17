'use sanity'

import { restoreRealTimersAndFailOnLeak } from '#testutils/timerGuard.js'

function leakReportOf(): unknown {
  try {
    restoreRealTimersAndFailOnLeak()
    return undefined
  } catch (err) {
    return err
  }
}

describe('testutils restoreRealTimersAndFailOnLeak()', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should report a leak when the test finishes with fake timers still installed', () => {
    vi.useFakeTimers()
    expect(leakReportOf()).toBeInstanceOf(Error)
  })

  it('should name vi.useRealTimers() as the fix in the leak report', () => {
    vi.useFakeTimers()
    expect(leakReportOf()).toHaveProperty('message', expect.stringContaining('vi.useRealTimers()'))
  })

  it('should put the clock back on real timers even when it reports a leak', () => {
    vi.useFakeTimers()
    leakReportOf()
    expect(vi.isFakeTimers()).toBe(false)
  })

  it('should report nothing when the test left real timers installed', () => {
    expect(leakReportOf()).toBeUndefined()
  })
})
