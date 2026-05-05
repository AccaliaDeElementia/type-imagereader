'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync.js'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

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

describe('utils/syncfolders function IncrementalUpdateFolders()', () => {
  let loggerStub = sandbox.stub()
  let loggerFake = Cast<Debugger>(loggerStub)

  let aggregateRowsForReturn: AggregateRow[] = []
  let whereRawCalls: Array<{ pattern: string; bindings: unknown[] }> = []
  let groupByCalls: unknown[] = []
  let upsertChunks: UpsertRow[][] = []
  let pruneDeletedRows = 0
  let pruneWhereCalls: unknown[][] = []
  let pruneAndWhereCalls: unknown[][] = []

  let picturesAggregateQuery = {
    select: sandbox.stub().returnsThis(),
    count: sandbox.stub().returnsThis(),
    sum: sandbox.stub().returnsThis(),
    whereRaw: sandbox.stub().returnsThis(),
    groupBy: sandbox.stub().returnsThis(),
    then: sandbox.stub(),
  }
  let foldersUpsertQuery = {
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    merge: sandbox.stub().resolves(),
  }
  let foldersPruneQuery = {
    where: sandbox.stub().returnsThis(),
    andWhere: sandbox.stub().returnsThis(),
    delete: sandbox.stub().resolves(0),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  const setup = (): void => {
    loggerStub = sandbox.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    whereRawCalls = []
    groupByCalls = []
    upsertChunks = []
    pruneWhereCalls = []
    pruneAndWhereCalls = []

    picturesAggregateQuery = {
      select: sandbox.stub().returnsThis(),
      count: sandbox.stub().returnsThis(),
      sum: sandbox.stub().returnsThis(),
      whereRaw: sandbox.stub().callsFake((pattern: string, bindings: unknown[]) => {
        whereRawCalls.push({ pattern, bindings })
        return picturesAggregateQuery
      }),
      groupBy: sandbox.stub().callsFake(async (arg: unknown) => {
        groupByCalls.push(arg)
        await Promise.resolve()
        return aggregateRowsForReturn
      }),
      then: sandbox.stub(),
    }
    foldersUpsertQuery = {
      insert: sandbox.stub().callsFake((chunk: UpsertRow[]) => {
        upsertChunks.push(chunk)
        return foldersUpsertQuery
      }),
      onConflict: sandbox.stub().returnsThis(),
      merge: sandbox.stub().resolves(),
    }
    foldersPruneQuery = {
      where: sandbox.stub().callsFake((...args: unknown[]) => {
        pruneWhereCalls.push(args)
        return foldersPruneQuery
      }),
      andWhere: sandbox.stub().callsFake((...args: unknown[]) => {
        pruneAndWhereCalls.push(args)
        return foldersPruneQuery
      }),
      delete: sandbox.stub().callsFake(async () => {
        await Promise.resolve()
        return pruneDeletedRows
      }),
    }

    let foldersCallCount = 0
    knexFnStub = sandbox.stub().callsFake((table: string) => {
      if (table === 'pictures') return picturesAggregateQuery
      if (table === 'folders') {
        foldersCallCount += 1
        // First N calls are upsert chunks, last is prune
        return foldersCallCount <= upsertCallExpectation ? foldersUpsertQuery : foldersPruneQuery
      }
      throw new Error(`Unexpected knex table: ${table}`)
    })
    Cast<Record<string, unknown>>(knexFnStub).raw = sandbox.stub().returns('CASE WHEN seen THEN 1 ELSE 0 END')
    knexFnFake = StubToKnex(knexFnStub)
  }

  let upsertCallExpectation = 1

  beforeEach(() => {
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(sandbox.stub()))
    aggregateRowsForReturn = []
    pruneDeletedRows = 0
    upsertCallExpectation = 1
    setup()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('with no affected folders', () => {
    beforeEach(() => {
      upsertCallExpectation = 0
      setup()
    })
    it('should not run the aggregate picture query', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set())
      expect(picturesAggregateQuery.whereRaw.callCount).to.equal(0)
    })
    it('should not run any folder upsert', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set())
      expect(foldersUpsertQuery.insert.callCount).to.equal(0)
    })
    it('should still run the empty-folder prune', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set())
      expect(foldersPruneQuery.delete.callCount).to.equal(1)
    })
  })

  describe('with one affected folder', () => {
    it('should issue exactly one aggregate picture query (single chunk)', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.whereRaw.callCount).to.equal(1)
    })
    it('should call select on the folder column for the aggregate', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.select.calledWith('folder')).to.equal(true)
    })
    it('should call count with totalCount alias', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.count.calledWith({ totalCount: '*' })).to.equal(true)
    })
    it('should call sum with seenCount alias', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(picturesAggregateQuery.sum.callCount).to.equal(1)
    })
    it('should group the aggregate by folder', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(groupByCalls).to.deep.equal(['folder'])
    })
    it('should pass the LIKE prefix as the binding', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(whereRawCalls[0]?.bindings).to.deep.equal(['/comics/%'])
    })
    it('should issue exactly one bulk upsert call (single chunk)', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersUpsertQuery.insert.callCount).to.equal(1)
    })
    it('should pass the rolled-up totalCount in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).to.equal(5)
    })
    it('should pass the rolled-up seenCount in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.seenCount).to.equal(3)
    })
    it('should pass the affected folder path in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.path).to.equal('/comics/')
    })
    it('should populate the parent folder column for INSERT safety', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.folder).to.equal('/')
    })
    it('should populate sortKey for INSERT safety', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.sortKey).to.equal(Imports.SyncFunctions.ToSortKey('comics'))
    })
    it('should call onConflict with path on the upsert', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersUpsertQuery.onConflict.firstCall.args).to.deep.equal(['path'])
    })
    it('should merge only totalCount and seenCount on conflict', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '5', seenCount: '3' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersUpsertQuery.merge.firstCall.args[0]).to.deep.equal(['totalCount', 'seenCount'])
    })
  })

  describe('with multiple affected folders sharing a chunk', () => {
    it('should issue one aggregate query covering all affected folders', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/a/', '/b/']))
      expect(picturesAggregateQuery.whereRaw.callCount).to.equal(1)
    })
    it('should pass each affected folder as a LIKE binding', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/a/', '/b/']))
      expect(whereRawCalls[0]?.bindings).to.have.members(['/a/%', '/b/%'])
    })
    it('should produce one OR-of-LIKE clause per affected folder', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/a/', '/b/']))
      const orCount = (whereRawCalls[0]?.pattern.match(/folder LIKE \?/giv) ?? []).length
      expect(orCount).to.equal(2)
    })
  })

  describe('rollup semantics', () => {
    it('should sum descendant per-folder counts into the affected folder total', async () => {
      aggregateRowsForReturn = [
        { folder: '/comics/', totalCount: '2', seenCount: '0' },
        { folder: '/comics/series/', totalCount: '5', seenCount: '0' },
      ]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).to.equal(7)
    })
    it('should sum descendant seen counts into the affected folder seenCount', async () => {
      aggregateRowsForReturn = [
        { folder: '/comics/', totalCount: '2', seenCount: '1' },
        { folder: '/comics/series/', totalCount: '5', seenCount: '4' },
      ]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.seenCount).to.equal(5)
    })
    it('should not roll up unrelated folders into an affected folder', async () => {
      aggregateRowsForReturn = [
        { folder: '/comics/', totalCount: '2', seenCount: '0' },
        { folder: '/photos/', totalCount: '99', seenCount: '0' },
      ]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).to.equal(2)
    })
    it('should treat null seenCount aggregate as zero', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: '0', seenCount: null }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.seenCount).to.equal(0)
    })
    it('should treat null totalCount aggregate as zero', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/', totalCount: null, seenCount: '0' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).to.equal(0)
    })
    it('should produce zero totals when no descendant rows are returned', async () => {
      aggregateRowsForReturn = []
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(upsertChunks.flat()[0]?.totalCount).to.equal(0)
    })
  })

  describe('when a deeply nested folder is affected', () => {
    it('should set parent folder to the immediate ancestor path', async () => {
      aggregateRowsForReturn = [{ folder: '/comics/series/', totalCount: '2', seenCount: '0' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/series/']))
      expect(upsertChunks.flat()[0]?.folder).to.equal('/comics/')
    })
  })

  describe('when the root folder is affected', () => {
    it('should emit the root sentinel (empty folder) in the upsert payload', async () => {
      aggregateRowsForReturn = [{ folder: '/', totalCount: '4', seenCount: '0' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/']))
      expect(upsertChunks.flat()[0]?.folder).to.equal('')
    })
    it('should emit an empty sortKey for the root upsert', async () => {
      aggregateRowsForReturn = [{ folder: '/', totalCount: '4', seenCount: '0' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/']))
      expect(upsertChunks.flat()[0]?.sortKey).to.equal('')
    })
    it('should set the upsert path to the root sentinel', async () => {
      aggregateRowsForReturn = [{ folder: '/', totalCount: '4', seenCount: '0' }]
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/']))
      expect(upsertChunks.flat()[0]?.path).to.equal('/')
    })
  })

  describe('prune step', () => {
    it('should call delete on the prune query', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(foldersPruneQuery.delete.callCount).to.equal(1)
    })
    it('should filter prune to folders with totalCount zero', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(pruneWhereCalls).to.deep.include(['totalCount', '=', 0])
    })
    it('should exclude root folder from prune delete', async () => {
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/']))
      expect(pruneAndWhereCalls).to.deep.include(['path', '<>', '/'])
    })
  })

  describe('logging', () => {
    it('should log a summary line with folder count and pruned count', async () => {
      pruneDeletedRows = 2
      setup()
      await Functions.IncrementalUpdateFolders(loggerFake, knexFnFake, new Set(['/comics/', '/photos/']))
      expect(loggerStub.lastCall.args[0]).to.equal(
        'Incremental folder update: 2 folders checked, 2 empty folders pruned',
      )
    })
  })
})
