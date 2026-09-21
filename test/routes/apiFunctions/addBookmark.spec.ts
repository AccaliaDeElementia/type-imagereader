'use sanity'

import { addBookmark } from '#routes/apiFunctions.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import type { MockInstance } from 'vitest'

const chainMethods = ['insert', 'onConflict', 'ignore'] as const
const terminalMethods = [] as const

const BOOKMARK_PATH = '/foo/bar/baz.png'

describe('routes/apiFunctions addBookmark', () => {
  let knexInstance = createKnexChainFake(chainMethods, terminalMethods).instance
  let knexStub: MockInstance = vi.fn()
  let knexFake = stubToKnex(knexStub)
  beforeEach(async () => {
    knexInstance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub = vi.fn().mockReturnValue(knexInstance)
    knexFake = stubToKnex(knexStub)
    await addBookmark(knexFake, BOOKMARK_PATH)
  })

  const expectedCalls: Array<[string, () => MockInstance, unknown[]]> = [
    ['target the bookmarks table', () => knexStub, ['bookmarks']],
    ['insert the requested path', () => knexInstance.insert, [{ path: BOOKMARK_PATH }]],
    ['resolve conflicts on the path column', () => knexInstance.onConflict, ['path']],
    ['ignore a conflicting insert', () => knexInstance.ignore, []],
  ]
  expectedCalls.forEach(([label, stub, args]: [string, () => MockInstance, unknown[]]): void => {
    it(`should ${label} exactly once`, () => {
      expect(stub().mock.calls).toEqual([args])
    })
  })
})
