'use sanity'

import { incrementalEnsureFoldersBulk } from '#sync/incrementalsync.js'
import { toSortKey } from '#sync/helpers.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

interface FolderRow {
  folder: string
  path: string
  sortKey: string
}

describe('sync/incrementalsync incrementalEnsureFoldersBulk()', () => {
  let folderChunks: FolderRow[][] = []
  let foldersInsertQuery = {
    insert: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    onConflict: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    ignore: vi.fn().mockResolvedValue(undefined),
  }
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  const setup = (): void => {
    folderChunks = []
    foldersInsertQuery = {
      insert: vi.fn().mockImplementation((chunk: FolderRow[]) => {
        folderChunks.push(chunk)
        return foldersInsertQuery
      }),
      onConflict: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      ignore: vi.fn().mockResolvedValue(undefined),
    }
    knexFnStub = vi.fn().mockImplementation((table: string) => {
      if (table === 'folders') return foldersInsertQuery
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = stubToKnex(knexFnStub)
  }

  beforeEach(() => {
    setup()
  })

  describe('when given an empty list', () => {
    it('should not call folders.insert', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, [])
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
  })

  describe('when given only the root folder', () => {
    it('should not call folders.insert (root sentinel is implicit)', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/'])
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
  })

  describe('when given a single non-root folder', () => {
    it('should bulk-insert one folder row', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()).toHaveLength(1)
    })
    it('should set the folder row path to the supplied folder', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.path).toBe('/comics/')
    })
    it('should set the folder row parent to / for a top-level folder', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.folder).toBe('/')
    })
    it('should set the folder row parent to the immediate parent for a nested folder', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/comics/series/'])
      expect(folderChunks.flat()[0]?.folder).toBe('/comics/')
    })
    it('should derive sortKey from the folder basename', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.sortKey).toBe(toSortKey('comics'))
    })
    it('should call onConflict with path', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(foldersInsertQuery.onConflict.mock.calls[0]).toEqual(['path'])
    })
    it('should call ignore (not merge)', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(foldersInsertQuery.ignore.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('when given duplicate folders', () => {
    it('should de-duplicate and insert each folder once', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/a/', '/a/', '/b/'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths.filter((p) => p === '/a/')).toHaveLength(1)
    })
  })

  describe('when given a mix of root and non-root folders', () => {
    it('should drop root and insert only the non-root folders', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/', '/a/', '/b/'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect([...paths].sort()).toEqual(['/a/', '/b/'].sort())
    })
  })

  describe('when given many folders', () => {
    it('should issue one bulk insert call for the chunk', async () => {
      await incrementalEnsureFoldersBulk(knexFnFake, ['/a/', '/b/', '/c/'])
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(1)
    })
  })
})
