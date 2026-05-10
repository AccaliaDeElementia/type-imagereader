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
    expect(knexStub.callCount).toBe(1)
  })
  it('should query bookmarks table with expected args to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.firstCall.args).toEqual(['bookmarks'])
  })
  it('should filter on provided path once to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.where.callCount).toBe(1)
  })
  it('should filter on provided path with expected args to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.where.firstCall.args).toEqual([{ path: '/foo/bar/baz.png' }])
  })
  it('should delete matched bookmarks once to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.delete.callCount).toBe(1)
  })
  it('should delete matched bookmarks with expected args to remove bookmark', async () => {
    await removeBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.delete.firstCall.args).toEqual([])
  })
})
