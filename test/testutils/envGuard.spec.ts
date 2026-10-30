'use sanity'

import { snapshotProcessEnv } from '#testutils/envGuard.js'

describe('testutils snapshotProcessEnv()', () => {
  it('should remove a variable added after the snapshot', () => {
    delete process.env.ENV_GUARD_SPEC_PROBE
    const restore = snapshotProcessEnv()
    process.env.ENV_GUARD_SPEC_PROBE = 'added'
    restore()
    expect(process.env).not.toHaveProperty('ENV_GUARD_SPEC_PROBE')
  })

  it('should put back a variable deleted after the snapshot', () => {
    process.env.ENV_GUARD_SPEC_PROBE = 'original'
    const restore = snapshotProcessEnv()
    delete process.env.ENV_GUARD_SPEC_PROBE
    restore()
    expect(process.env.ENV_GUARD_SPEC_PROBE).toBe('original')
  })

  it('should revert a variable changed after the snapshot', () => {
    process.env.ENV_GUARD_SPEC_PROBE = 'original'
    const restore = snapshotProcessEnv()
    process.env.ENV_GUARD_SPEC_PROBE = 'changed'
    restore()
    expect(process.env.ENV_GUARD_SPEC_PROBE).toBe('original')
  })

  it('should restore the same snapshot each time it is called', () => {
    process.env.ENV_GUARD_SPEC_PROBE = 'original'
    const restore = snapshotProcessEnv()
    process.env.ENV_GUARD_SPEC_PROBE = 'changed'
    restore()
    process.env.ENV_GUARD_SPEC_PROBE = 'changed again'
    restore()
    expect(process.env.ENV_GUARD_SPEC_PROBE).toBe('original')
  })
})

describe('testutils env guard setup', () => {
  it('should let a test set a variable', () => {
    process.env.ENV_GUARD_SPEC_PROBE = 'leaked'
    expect(process.env.ENV_GUARD_SPEC_PROBE).toBe('leaked')
  })

  it('should not leak a variable set by the previous test into the next test', () => {
    expect(process.env).not.toHaveProperty('ENV_GUARD_SPEC_PROBE')
  })
})
