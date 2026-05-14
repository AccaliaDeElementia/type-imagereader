'use sanity'

import { syncMissingAncestorFolders } from '#sync/folders.js'
import { toSortKey } from '#sync/helpers.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

interface InsertedRow {
  folder: string
  path: string
  sortKey: string
}

describe('sync/folders syncMissingAncestorFolders()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()

  let distinctPictureFolders: Array<{ folder: string }> = []
  let existingFolderPaths: Array<{ path: string }> = []
  let insertedChunks: InsertedRow[][] = []
  let whereInCalls: unknown[][] = []

  let picturesQuery = {
    distinct: vi.fn(),
    whereNotNull: vi.fn(),
  }
  let foldersSelectQuery = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereIn: vi.fn(),
  }
  let foldersInsertQuery = {
    insert: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    onConflict: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    ignore: vi.fn(),
  }
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  const setup = (): void => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake())
    insertedChunks = []
    whereInCalls = []

    picturesQuery = {
      distinct: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereNotNull: vi.fn().mockResolvedValue(distinctPictureFolders),
    }
    const runWhereIn = async (_col: string, values: unknown[]): Promise<Array<{ path: string }>> => {
      whereInCalls.push(values)
      await Promise.resolve()
      return existingFolderPaths.filter((r) => values.includes(r.path))
    }
    foldersSelectQuery = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereIn: vi.fn().mockImplementation(runWhereIn),
    }
    foldersInsertQuery = {
      insert: vi.fn().mockImplementation((chunk: InsertedRow[]) => {
        insertedChunks.push(chunk)
        return foldersInsertQuery
      }),
      onConflict: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      ignore: vi.fn().mockResolvedValue(undefined),
    }

    let foldersCallCount = 0
    knexFnStub = vi.fn().mockImplementation((table: string) => {
      if (table === 'pictures') return picturesQuery
      if (table === 'folders') {
        foldersCallCount += 1
        // first folders call is the existence lookup, subsequent calls are inserts
        // both readers and writers may interleave across chunks, so fall back to type detection
        return foldersCallCount === 1 ? foldersSelectQuery : foldersInsertQuery
      }
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = stubToKnex(knexFnStub)
  }

  beforeEach(() => {
    distinctPictureFolders = []
    existingFolderPaths = []
    setup()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when no pictures exist', () => {
    beforeEach(() => {
      distinctPictureFolders = []
      setup()
    })
    it('should not attempt folder inserts', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
    it('should log zero added ancestors', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 0 missing ancestor folders')
    })
  })

  describe('when a picture sits directly under root with root folder present', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/' }]
      existingFolderPaths = [{ path: '/' }]
      setup()
    })
    it('should not insert any rows (root is implicit)', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(insertedChunks.flat()).toHaveLength(0)
    })
  })

  describe('when a deep picture has all ancestors missing', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/b/c/' }]
      existingFolderPaths = []
      setup()
    })
    it('should insert a row for each missing ancestor', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect([...paths].sort()).toEqual(['/a/', '/a/b/', '/a/b/c/'].sort())
    })
    it('should not insert a row for the implicit root', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).not.toContain('/')
    })
    it('should set the correct parent folder on each inserted row', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/']?.folder).toBe('/a/')
    })
    it('should set the parent to root for a top-level ancestor', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/']?.folder).toBe('/')
    })
    it('should derive sortKey from the folder basename', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/c/']?.sortKey).toBe(toSortKey('c'))
    })
    it('should log the number of ancestors added', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 3 missing ancestor folders')
    })
    it('should use onConflict on path when inserting', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.onConflict.mock.calls[0]).toEqual(['path'])
    })
    it('should use ignore (not merge) when inserting', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.ignore.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('when some ancestors already exist', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/b/c/' }]
      existingFolderPaths = [{ path: '/a/' }, { path: '/a/b/c/' }]
      setup()
    })
    it('should only insert the missing ancestor', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).toEqual(['/a/b/'])
    })
    it('should log the number of ancestors actually added', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 1 missing ancestor folders')
    })
  })

  describe('when all ancestor candidates already exist', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/' }]
      existingFolderPaths = [{ path: '/a/' }]
      setup()
    })
    it('should not call insert', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
    it('should log zero ancestors added', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 0 missing ancestor folders')
    })
  })

  describe('when multiple leaf folders share ancestors', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/b/c/' }, { folder: '/a/b/d/' }]
      existingFolderPaths = []
      setup()
    })
    it('should de-duplicate the shared ancestors', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect([...paths].sort()).toEqual(['/a/', '/a/b/', '/a/b/c/', '/a/b/d/'].sort())
    })
  })

  describe('query shape', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/' }]
      existingFolderPaths = []
      setup()
    })
    it('should query pictures once for distinct folders', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(knexFnStub.mock.calls.filter((c) => c[0] === 'pictures').length).toBe(1)
    })
    it('should call distinct with folder column', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(picturesQuery.distinct.mock.calls[0]).toEqual(['folder'])
    })
    it('should exclude null folders from the picture query', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(picturesQuery.whereNotNull.mock.calls[0]).toEqual(['folder'])
    })
    it('should look up existing folder paths with whereIn', async () => {
      await syncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(whereInCalls.flat()).toContain('/a/')
    })
  })
})
