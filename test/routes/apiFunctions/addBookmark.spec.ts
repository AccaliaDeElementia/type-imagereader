'use sanity'

import { addBookmark } from '#routes/apiFunctions.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import type { MockInstance } from 'vitest'

const chainMethods = ['insert', 'onConflict', 'ignore'] as const
const terminalMethods = [] as const

describe('routes/apiFunctions addBookmark', () => {
  let knexInstance = createKnexChainFake(chainMethods, terminalMethods).instance
  let knexStub: MockInstance = vi.fn()
  let knexFake = stubToKnex(knexStub)
  beforeEach(() => {
    knexInstance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub = vi.fn().mockReturnValue(knexInstance)
    knexFake = stubToKnex(knexStub)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should query bookmarks table once to set bookmark', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls.length).toBe(1)
  })
  it('should query bookmarks table with expected args to set bookmark', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls[0]).toEqual(['bookmarks'])
  })
  it('should insert provided path once to set bookmark', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.insert.mock.calls.length).toBe(1)
  })
  it('should insert provided path with expected args to set bookmark', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.insert.mock.calls[0]).toEqual([{ path: '/foo/bar/baz.png' }])
  })
  it('should resolve conflicts once when path already exists', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.onConflict.mock.calls.length).toBe(1)
  })
  it('should resolve conflicts with expected args when path already exists', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.onConflict.mock.calls[0]).toEqual(['path'])
  })
  it('should ignore conflicts once on insert to set bookmark', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.ignore.mock.calls.length).toBe(1)
  })
  it('should ignore conflicts with expected args on insert to set bookmark', async () => {
    await addBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.ignore.mock.calls[0]).toEqual([])
  })
})
