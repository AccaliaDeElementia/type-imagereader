'use sanity'

import { incrementalUpdateFolders } from '#sync/incrementalsync.js'
import { toSortKey } from '#sync/helpers.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

interface AggregateRow {
  folder: string
  totalCount: number | string | null
  seenCount: number | string | null
}
interface UpsertRow {
  path: string
  totalCount: number
  seenCount: number
  folder: string
  sortKey: string
}

describe('sync/incrementalsync incrementalUpdateFolders()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()

  let aggregateRowsForReturn: AggregateRow[] = []
  let whereRawCalls: Array<{ pattern: string; bindings: unknown[] }> = []
  let groupByCalls: unknown[] = []
  let upsertChunks: UpsertRow[][] = []
  let pruneDeletedRows = 0
  let pruneWhereCalls: unknown[][] = []
  let pruneAndWhereCalls: unknown[][] = []

  let picturesAggregateQuery = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    count: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    sum: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereRaw: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    groupBy: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    then: vi.fn(),
  }
  let foldersUpsertQuery = {
    insert: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    onConflict: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    merge: vi.fn().mockResolvedValue(undefined),
  }
  let foldersPruneQuery = {
    where: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    andWhere: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    delete: vi.fn().mockResolvedValue(0),
  }
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  const setup = (): void => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake())
    whereRawCalls = []
    groupByCalls = []
    upsertChunks = []
    pruneWhereCalls = []
    pruneAndWhereCalls = []

    picturesAggregateQuery = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      count: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      sum: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereRaw: vi.fn().mockImplementation((pattern: string, bindings: unknown[]) => {
        whereRawCalls.push({ pattern, bindings })
        return picturesAggregateQuery
      }),
      groupBy: vi.fn().mockImplementation(async (arg: unknown) => {
        groupByCalls.push(arg)
        await Promise.resolve()
        return aggregateRowsForReturn
      }),
      then: vi.fn(),
    }
    foldersUpsertQuery = {
      insert: vi.fn().mockImplementation((chunk: UpsertRow[]) => {
        upsertChunks.push(chunk)
        return foldersUpsertQuery
      }),
      onConflict: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      merge: vi.fn().mockResolvedValue(undefined),
    }
    foldersPruneQuery = {
      where: vi.fn().mockImplementation((...args: unknown[]) => {
        pruneWhereCalls.push(args)
        return foldersPruneQuery
      }),
      andWhere: vi.fn().mockImplementation((...args: unknown[]) => {
        pruneAndWhereCalls.push(args)
        return foldersPruneQuery
      }),
      delete: vi.fn().mockImplementation(async () => {
        await Promise.resolve()
        return pruneDeletedRows
      }),
    }

    let foldersCallCount = 0
    knexFnStub = vi.fn().mockImplementation((table: string) => {
      if (table === 'pictures') return picturesAggregateQuery
      if (table === 'folders') {
        foldersCallCount += 1
        // First N calls are upsert chunks, last is prune
        return foldersCallCount <= upsertCallExpectation ? foldersUpsertQuery : foldersPruneQuery
      }
      throw new Error(`Unexpected knex table: ${table}`)
    })
    cast<Record<string, unknown>>(knexFnStub).raw = vi.fn().mockReturnValue('CASE WHEN seen THEN 1 ELSE 0 END')
    knexFnFake = stubToKnex(knexFnStub)
  }

  let upsertCallExpectation = 1

  beforeEach(() => {
    aggregateRowsForReturn = []
    pruneDeletedRows = 0
    upsertCallExpectation = 1
    setup()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('with no affected folders', () => {
    beforeEach(() => {
      upsertCallExpectation = 0
      setup()
    })
    it('should not run the aggregate picture query', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set())
      expect(picturesAggregateQuery.whereRaw.mock.calls.length).toBe(0)
    })
    it('should not run any folder upsert', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set())
      expect(foldersUpsertQuery.insert.mock.calls.length).toBe(0)
    })
    it('should still run the empty-folder prune', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set())
      expect(foldersPruneQuery.delete.mock.calls.length).toBe(1)
    })
  })

  describe('with one affected folder', () => {
    it('should issue exactly one aggregate picture query (single chunk)', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.whereRaw.mock.calls.length).toBe(1)
    })
    it('should call select on the folder column for the aggregate', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.select).toHaveBeenCalledWith('folder')
    })
    it('should call count with totalCount alias', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.count).toHaveBeenCalledWith({ totalCount: '*' })
    })
    it('should call sum with seenCount alias', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.sum.mock.calls.length).toBe(1)
    })
    it('should group the aggregate by folder', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(groupByCalls).toEqual(['folder'])
    })
    it('should pass the LIKE prefix as the binding', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(whereRawCalls[0]?.bindings).toEqual(['/comics/%'])
    })
    it('should issue exactly one bulk upsert call (single chunk)', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersUpsertQuery.insert.mock.calls.length).toBe(1)
    })
    it('should pass the rolled-up totalCount in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).toBe(5)
    })
    it('should pass the rolled-up seenCount in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.seenCount).toBe(3)
    })
    it('should pass the affected folder path in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.path).toBe('/comics/')
    })
    it('should populate the parent folder column for INSERT safety', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.folder).toBe('/')
    })
    it('should populate sortKey for INSERT safety', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.sortKey).toBe(toSortKey('comics'))
    })
    it('should call onConflict with path on the upsert', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersUpsertQuery.onConflict.mock.calls[0]).toEqual(['path'])
    })
    it('should merge only totalCount and seenCount on conflict', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersUpsertQuery.merge.mock.calls[0]?.[0]).toEqual(['totalCount', 'seenCount'])
    })
  })

  describe('with multiple affected folders sharing a chunk', () => {
    it('should issue one aggregate query covering all affected folders', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/a/', '/b/']))
      expect(picturesAggregateQuery.whereRaw.mock.calls.length).toBe(1)
    })
    it('should pass each affected folder as a LIKE binding', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/a/', '/b/']))
      expect([...cast<string[]>(whereRawCalls[0]?.bindings ?? [])].sort()).toEqual(['/a/%', '/b/%'].sort())
    })
    it('should produce one OR-of-LIKE clause per affected folder', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/a/', '/b/']))
      const orCount = (whereRawCalls[0]?.pattern.match(/folder LIKE \?/giv) ?? []).length
      expect(orCount).toBe(2)
    })
  })

  describe('rollup semantics', () => {
    it('should sum descendant per-folder counts into the affected folder total', async () => {
      aggregateRowsForReturn = [
        { folder: '/comics/', totalCount: '2', seenCount: '0' },
        { folder: '/comics/series/', totalCount: '5', seenCount: '0' },
      ]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).toBe(7)
    })
    it('should sum descendant seen counts into the affected folder seenCount', async () => {
      aggregateRowsForReturn = [
        { folder: '/comics/', totalCount: '2', seenCount: '1' },
        { folder: '/comics/series/', totalCount: '5', seenCount: '4' },
      ]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.seenCount).toBe(5)
    })
    it('should not roll up unrelated folders into an affected folder', async () => {
      aggregateRowsForReturn = [
        { folder: '/comics/', totalCount: '2', seenCount: '0' },
        { folder: '/photos/', totalCount: '99', seenCount: '0' },
      ]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).toBe(2)
    })
    it('should treat null seenCount aggregate as zero', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '0', seenCount: null }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.seenCount).toBe(0)
    })
    it('should treat null totalCount aggregate as zero', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: null, seenCount: '0' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).toBe(0)
    })
    it('should produce zero totals when no descendant rows are returned', async () => {
      aggregateRowsForReturn = []
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).toBe(0)
    })
  })

  describe('when a deeply nested folder is affected', () => {
    it('should set parent folder to the immediate ancestor path', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/series/', totalCount: '2', seenCount: '0' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/series/']))
      expect(upsertChunks.flat()[0]?.folder).toBe('/comics/')
    })
  })

  describe('when the root folder is affected', () => {
    it('should emit the root sentinel (empty folder) in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/', totalCount: '4', seenCount: '0' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/']))
      expect(upsertChunks.flat()[0]?.folder).toBe('')
    })
    it('should emit an empty sortKey for the root upsert', async () => {
      aggregateRowsForReturn = [{ folder: '/', totalCount: '4', seenCount: '0' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/']))
      expect(upsertChunks.flat()[0]?.sortKey).toBe('')
    })
    it('should set the upsert path to the root sentinel', async () => {
      aggregateRowsForReturn = [{ folder: '/', totalCount: '4', seenCount: '0' }]
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/']))
      expect(upsertChunks.flat()[0]?.path).toBe('/')
    })
  })

  describe('prune step', () => {
    it('should call delete on the prune query', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersPruneQuery.delete.mock.calls.length).toBe(1)
    })
    it('should filter prune to folders with totalCount zero', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(pruneWhereCalls).toContainEqual(['totalCount', '=', 0])
    })
    it('should exclude root folder from prune delete', async () => {
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(pruneAndWhereCalls).toContainEqual(['path', '<>', '/'])
    })
  })

  describe('logging', () => {
    it('should log a summary line with folder count and pruned count', async () => {
      pruneDeletedRows = 2
      setup()
      await incrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/', '/photos/']))
      expect(loggerStub.mock.lastCall?.[0]).toBe('Incremental folder update: 2 folders checked, 2 empty folders pruned')
    })
  })
})
