'use sanity'

import { incrementalEnsureAncestors } from '#sync/incrementalsync.js'
import { toSortKey } from '#sync/helpers.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

interface InsertedRow {
  folder: string
  path: string
  sortKey: string
}

describe('sync/incrementalsync incrementalEnsureAncestors()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()

  let existingFolderPaths: Array<{ path: string }> = []
  let insertedChunks: InsertedRow[][] = []
  let whereInCalls: unknown[][] = []

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
      if (table === 'folders') {
        foldersCallCount += 1
        return foldersCallCount === 1 ? foldersSelectQuery : foldersInsertQuery
      }
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = stubToKnex(knexFnStub)
  }

  beforeEach(() => {
    existingFolderPaths = []
    setup()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when affected folders is empty', () => {
    it('should not attempt any folder inserts', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set())
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
    it('should log zero ensured', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set())
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Ensured 0 ancestor folders')
    })
  })

  describe('when only root is affected', () => {
    it('should not attempt any folder inserts', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/']))
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
    it('should log zero ensured', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/']))
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Ensured 0 ancestor folders')
    })
  })

  describe('when a deep folder has all strict ancestors missing', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should insert a row for each missing strict ancestor', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect([...paths].sort()).toEqual(['/a/', '/a/b/'].sort())
    })
    it('should not re-create the affected folder itself', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).not.toContain('/a/b/c/')
    })
    it('should not insert a row for the implicit root', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).not.toContain('/')
    })
    it('should set the correct parent folder on each inserted row', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/']?.folder).toBe('/a/')
    })
    it('should set the parent to root for a top-level ancestor', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/']?.folder).toBe('/')
    })
    it('should derive sortKey from the folder basename', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/']?.sortKey).toBe(toSortKey('b'))
    })
    it('should log the number of ancestors ensured', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Ensured 2 ancestor folders')
    })
    it('should use onConflict on path when inserting', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(foldersInsertQuery.onConflict.mock.calls[0]).toEqual(['path'])
    })
    it('should use ignore (not merge) when inserting', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(foldersInsertQuery.ignore.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('when all strict ancestors already exist', () => {
    beforeEach(() => {
      existingFolderPaths = [{ path: '/a/' }, { path: '/a/b/' }]
      setup()
    })
    it('should not call insert', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
    it('should log zero ancestors ensured', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(loggerStub.mock.calls[0]?.[0]).toBe('Ensured 0 ancestor folders')
    })
  })

  describe('when multiple affected folders share ancestors', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should de-duplicate the shared ancestors', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/', '/a/b/d/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect([...paths].sort()).toEqual(['/a/', '/a/b/'].sort())
    })
  })

  describe('when only a top-level folder is affected', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should not insert any rows (strict ancestor is root, which is implicit)', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/']))
      expect(insertedChunks.flat()).toHaveLength(0)
    })
  })

  describe('query shape', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should look up existing folder paths with whereIn', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(whereInCalls.flat()).toContain('/a/')
    })
    it('should look up all strict ancestors in the whereIn', async () => {
      await incrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(whereInCalls.flat()).toContain('/a/b/')
    })
  })
})
