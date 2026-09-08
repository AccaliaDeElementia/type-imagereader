'use sanity'

import eslintConfig from '../../eslint.config.mjs'
import { shouldGuard } from '#testutils/pubsub.js'

const SOURCE_SIDE_ONLY = 'testutils/pubsub.ts'

function eslintPubsubAllowlist(): string[] {
  const block = eslintConfig.find(
    (entry) => entry.rules?.['no-restricted-imports'] === 'off' && Array.isArray(entry.files),
  )
  if (block?.files === undefined) throw new Error('no eslint block disables no-restricted-imports')
  return block.files
}

function toRuntimePath(glob: string): string {
  return `/${glob.replace(/\/\*\*$/v, '/')}`
}

describe('pubsub allowlist stays in sync with the runtime guard', () => {
  it('should find the eslint allowlist block', () => {
    expect(eslintPubsubAllowlist().length).toBeGreaterThan(0)
  })

  eslintPubsubAllowlist()
    .filter((glob) => glob !== SOURCE_SIDE_ONLY)
    .forEach((glob) => {
      it(`should exempt '${glob}' from the runtime mountPubSub guard too`, () => {
        expect(shouldGuard(toRuntimePath(glob))).toBe(false)
      })
    })

  it('should still guard a path that is on neither list', () => {
    expect(shouldGuard('/test/public/app/folders/init.spec.ts')).toBe(true)
  })

  it('should keep the source-side entry out of the runtime list because the guard never sees it', () => {
    expect(shouldGuard(`/${SOURCE_SIDE_ONLY}`)).toBe(true)
  })
})
