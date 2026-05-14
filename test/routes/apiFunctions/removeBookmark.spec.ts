'use sanity'

import { removeBookmark } from '#routes/apiFunctions.js'
import { createKnexChainFake } from '#testutils/knex.js'

describe('routes/apiFunctions removeBookmark', () => {
  let {
    instance: knexInstance,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['where', 'delete'] as const, [] as const)
  beforeEach(() => {
    ;({
      instance: knexInstance,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['where', 'delete'] as const, [] as const))
  })
  it('should query bookmarks table once to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls.length).toBe(1)
  })
  it('should query bookmarks table with expected args to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls[0]).toEqual(['bookmarks'])
  })
  it('should filter on provided path once to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.where.mock.calls.length).toBe(1)
  })
  it('should filter on provided path with expected args to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.where.mock.calls[0]).toEqual([{ path: '/foo/bar/baz.png' }])
  })
  it('should delete matched bookmarks once to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.delete.mock.calls.length).toBe(1)
  })
  it('should delete matched bookmarks with expected args to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.delete.mock.calls[0]).toEqual([])
  })
})
