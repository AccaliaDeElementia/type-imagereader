'use sanity'

import { getBookmarks, Imports } from '#routes/apiFunctions.js'
import { createKnexChainFake } from '#testutils/knex.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'
describe('routes/apiFunctions getBookmarks', () => {
  let {
    instance: knexInstance,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['select', 'join'] as const, ['orderBy'] as const)
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    ;({
      instance: knexInstance,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['select', 'join'] as const, ['orderBy'] as const))
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  it('should select results from bookmarks once', async () => {
    await getBookmarks(knexFake)
    expect(knexStub.mock.calls.length).toBe(1)
  })
  it('should select results from bookmarks table', async () => {
    await getBookmarks(knexFake)
    expect(knexStub.mock.calls[0]).toEqual(['bookmarks'])
  })
  it('should select expected fields from bookmarks once', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.select.mock.calls.length).toBe(1)
  })
  it('should select expected number of fields from bookmarks', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.select.mock.calls[0]).toHaveLength(2)
  })
  it('should select pictures.path from bookmarks', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.select.mock.calls[0]).toContain('pictures.path')
  })
  it('should select pictures.folder from bookmarks', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.select.mock.calls[0]).toContain('pictures.folder')
  })
  it('should join pictures to bookmarks at least once', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.join.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
  it('should join pictures to bookmarks with expected args', async () => {
    await getBookmarks(knexFake)
    const call = knexInstance.join.mock.calls.find((call) => call[0] === 'pictures')
    assert(call !== undefined)
    expect(call).toEqual(['pictures', 'pictures.path', 'bookmarks.path'])
  })
  it('should join folders to bookmarks at least once', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.join.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
  it('should join folders to bookmarks with expected args', async () => {
    await getBookmarks(knexFake)
    const call = knexInstance.join.mock.calls.find((call) => call[0] === 'folders')
    assert(call !== undefined)
    expect(call).toEqual(['folders', 'folders.path', 'pictures.folder'])
  })
  it('should order strictly by folder then picture once', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.orderBy.mock.calls.length).toBe(1)
  })
  it('should order strictly by folder then picture with one arg', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.orderBy.mock.calls[0]).toHaveLength(1)
  })
  it('should order strictly by folder then picture including sortkey and paths', async () => {
    await getBookmarks(knexFake)
    expect(knexInstance.orderBy.mock.calls[0]?.[0]).toEqual([
      'folders.path',
      'folders.sortKey',
      'pictures.sortKey',
      'pictures.path',
    ])
  })
  it('should include the only bookmark folder in results', async () => {
    knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/quux.png', folder: '/foo/bar/' }])
    const bookmarks = await getBookmarks(knexFake)
    expect(bookmarks).toHaveLength(1)
    expect(bookmarks[0]).toEqual({
      name: '/foo/bar/',
      path: '/foo/bar/',
      bookmarks: [{ name: 'quux.png', path: '/foo/bar/quux.png', folder: '/foo/bar/' }],
    })
  })
  it('should resolve to empty with no bookmarks', async () => {
    knexInstance.orderBy.mockResolvedValue([])
    const bookmarks = await getBookmarks(knexFake)
    expect(bookmarks).toEqual([])
  })
  it('should resolve to results with bookmarks', async () => {
    knexInstance.orderBy.mockResolvedValue([
      { path: '/foo/a bar/a quux.png', folder: '/foo/a bar/' },
      { path: '/foo/a bar/a quuux.png', folder: '/foo/a bar/' },
      { path: '/foo/a baz/a quux.png', folder: '/foo/a baz/' },
    ])
    const expected = [
      {
        name: '/foo/a bar/',
        path: '/foo/a%20bar/',
        bookmarks: [
          {
            name: 'a quux.png',
            path: '/foo/a%20bar/a%20quux.png',
            folder: '/foo/a%20bar/',
          },
          {
            name: 'a quuux.png',
            path: '/foo/a%20bar/a%20quuux.png',
            folder: '/foo/a%20bar/',
          },
        ],
      },
      {
        name: '/foo/a baz/',
        path: '/foo/a%20baz/',
        bookmarks: [
          {
            name: 'a quux.png',
            path: '/foo/a%20baz/a%20quux.png',
            folder: '/foo/a%20baz/',
          },
        ],
      },
    ]
    const bookmarks = await getBookmarks(knexFake)
    expect(bookmarks).toEqual(expected)
  })
  it('should log a bookmark and folder count summary', async () => {
    knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/quux.png', folder: '/foo/bar/' }])
    await getBookmarks(knexFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('getBookmarks'))
    expect(matched).toBe(true)
  })
})
