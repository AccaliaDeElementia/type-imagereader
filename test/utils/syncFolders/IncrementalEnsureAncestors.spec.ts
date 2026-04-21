'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

interface InsertedRow {
  folder: string
  path: string
  sortKey: string
}

describe('utils/syncfolders function IncrementalEnsureAncestors()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)

  let existingFolderPaths: Array<{ path: string }> = []
  let insertedChunks: InsertedRow[][] = []
  let whereInCalls: unknown[][] = []

  let foldersSelectQuery = {
    select: Sinon.stub().returnsThis(),
    whereIn: Sinon.stub(),
  }
  let foldersInsertQuery = {
    insert: Sinon.stub().returnsThis(),
    onConflict: Sinon.stub().returnsThis(),
    ignore: Sinon.stub(),
  }
  let knexFnStub = Sinon.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  const setup = (): void => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    insertedChunks = []
    whereInCalls = []

    const runWhereIn = async (_col: string, values: unknown[]): Promise<Array<{ path: string }>> => {
      whereInCalls.push(values)
      await Promise.resolve()
      return existingFolderPaths.filter((r) => values.includes(r.path))
    }
    foldersSelectQuery = {
      select: Sinon.stub().returnsThis(),
      whereIn: Sinon.stub().callsFake(runWhereIn),
    }
    foldersInsertQuery = {
      insert: Sinon.stub().callsFake((chunk: InsertedRow[]) => {
        insertedChunks.push(chunk)
        return foldersInsertQuery
      }),
      onConflict: Sinon.stub().returnsThis(),
      ignore: Sinon.stub().resolves(),
    }

    let foldersCallCount = 0
    knexFnStub = Sinon.stub().callsFake((table: string) => {
      if (table === 'folders') {
        foldersCallCount += 1
        return foldersCallCount === 1 ? foldersSelectQuery : foldersInsertQuery
      }
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = StubToKnex(knexFnStub)
  }

  beforeEach(() => {
    existingFolderPaths = []
    setup()
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('when affected folders is empty', () => {
    it('should not attempt any folder inserts', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set())
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
    it('should log zero ensured', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set())
      expect(loggerStub.firstCall.args[0]).to.equal('Ensured 0 ancestor folders')
    })
  })

  describe('when only root is affected', () => {
    it('should not attempt any folder inserts', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/']))
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
    it('should log zero ensured', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/']))
      expect(loggerStub.firstCall.args[0]).to.equal('Ensured 0 ancestor folders')
    })
  })

  describe('when a deep folder has all strict ancestors missing', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should insert a row for each missing strict ancestor', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.have.members(['/a/', '/a/b/'])
    })
    it('should not re-create the affected folder itself', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.not.include('/a/b/c/')
    })
    it('should not insert a row for the implicit root', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.not.include('/')
    })
    it('should set the correct parent folder on each inserted row', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/']?.folder).to.equal('/a/')
    })
    it('should set the parent to root for a top-level ancestor', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/']?.folder).to.equal('/')
    })
    it('should derive sortKey from the folder basename', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/']?.sortKey).to.equal(Imports.SyncFunctions.ToSortKey('b'))
    })
    it('should log the number of ancestors ensured', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(loggerStub.firstCall.args[0]).to.equal('Ensured 2 ancestor folders')
    })
    it('should use onConflict on path when inserting', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(foldersInsertQuery.onConflict.firstCall.args).to.deep.equal(['path'])
    })
    it('should use ignore (not merge) when inserting', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(foldersInsertQuery.ignore.callCount).to.be.above(0)
    })
  })

  describe('when all strict ancestors already exist', () => {
    beforeEach(() => {
      existingFolderPaths = [{ path: '/a/' }, { path: '/a/b/' }]
      setup()
    })
    it('should not call insert', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
    it('should log zero ancestors ensured', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(loggerStub.firstCall.args[0]).to.equal('Ensured 0 ancestor folders')
    })
  })

  describe('when multiple affected folders share ancestors', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should de-duplicate the shared ancestors', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/', '/a/b/d/']))
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.have.members(['/a/', '/a/b/'])
    })
  })

  describe('when only a top-level folder is affected', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should not insert any rows (strict ancestor is root, which is implicit)', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/']))
      expect(insertedChunks.flat()).to.have.lengthOf(0)
    })
  })

  describe('query shape', () => {
    beforeEach(() => {
      existingFolderPaths = []
      setup()
    })
    it('should look up existing folder paths with whereIn', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(whereInCalls.flat()).to.include('/a/')
    })
    it('should look up all strict ancestors in the whereIn', async () => {
      await Functions.IncrementalEnsureAncestors(loggerFake, knexFnFake, new Set(['/a/b/c/']))
      expect(whereInCalls.flat()).to.include('/a/b/')
    })
  })
})
