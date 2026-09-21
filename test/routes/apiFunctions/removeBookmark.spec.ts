'use sanity'

import { removeBookmark } from '#routes/apiFunctions.js'
import { createKnexChainFake } from '#testutils/knex.js'
import type { MockInstance } from 'vitest'

const BOOKMARK_PATH = '/foo/bar/baz.png'

describe('routes/apiFunctions removeBookmark', () => {
  let {
    instance: knexInstance,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['where', 'delete'] as const, [] as const)
  beforeEach(async () => {
    ;({
      instance: knexInstance,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['where', 'delete'] as const, [] as const))
    await removeBookmark(knexFake, BOOKMARK_PATH)
  })

  const expectedCalls: Array<[string, () => MockInstance, unknown[]]> = [
    ['target the bookmarks table', () => knexStub, ['bookmarks']],
    ['filter on the requested path', () => knexInstance.where, [{ path: BOOKMARK_PATH }]],
    ['delete the matched bookmarks', () => knexInstance.delete, []],
  ]
  expectedCalls.forEach(([label, stub, args]: [string, () => MockInstance, unknown[]]): void => {
    it(`should ${label} exactly once`, () => {
      expect(stub().mock.calls).toEqual([args])
    })
  })
})
