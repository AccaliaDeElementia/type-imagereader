'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/syncfolders.js'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

interface InsertedRow {
  folder: string
  path: string
  sortKey: string
}

describe('utils/syncfolders function SyncMissingAncestorFolders()', () => {
  let loggerStub = sandbox.stub()
  let loggerFake = Cast<Debugger>(loggerStub)

  let distinctPictureFolders: Array<{ folder: string }> = []
  let existingFolderPaths: Array<{ path: string }> = []
  let insertedChunks: InsertedRow[][] = []
  let whereInCalls: unknown[][] = []

  let picturesQuery = {
    distinct: sandbox.stub(),
    whereNotNull: sandbox.stub(),
  }
  let foldersSelectQuery = {
    select: sandbox.stub().returnsThis(),
    whereIn: sandbox.stub(),
  }
  let foldersInsertQuery = {
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    ignore: sandbox.stub(),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  const setup = (): void => {
    loggerStub = sandbox.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    insertedChunks = []
    whereInCalls = []

    picturesQuery = {
      distinct: sandbox.stub().returnsThis(),
      whereNotNull: sandbox.stub().resolves(distinctPictureFolders),
    }
    const runWhereIn = async (_col: string, values: unknown[]): Promise<Array<{ path: string }>> => {
      whereInCalls.push(values)
      await Promise.resolve()
      return existingFolderPaths.filter((r) => values.includes(r.path))
    }
    foldersSelectQuery = {
      select: sandbox.stub().returnsThis(),
      whereIn: sandbox.stub().callsFake(runWhereIn),
    }
    foldersInsertQuery = {
      insert: sandbox.stub().callsFake((chunk: InsertedRow[]) => {
        insertedChunks.push(chunk)
        return foldersInsertQuery
      }),
      onConflict: sandbox.stub().returnsThis(),
      ignore: sandbox.stub().resolves(),
    }

    let foldersCallCount = 0
    knexFnStub = sandbox.stub().callsFake((table: string) => {
      if (table === 'pictures') return picturesQuery
      if (table === 'folders') {
        foldersCallCount += 1
        // first folders call is the existence lookup, subsequent calls are inserts
        // both readers and writers may interleave across chunks, so fall back to type detection
        return foldersCallCount === 1 ? foldersSelectQuery : foldersInsertQuery
      }
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = StubToKnex(knexFnStub)
  }

  beforeEach(() => {
    distinctPictureFolders = []
    existingFolderPaths = []
    setup()
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('when no pictures exist', () => {
    beforeEach(() => {
      distinctPictureFolders = []
      setup()
    })
    it('should not attempt folder inserts', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
    it('should log zero added ancestors', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.firstCall.args[0]).to.equal('Added 0 missing ancestor folders')
    })
  })

  describe('when a picture sits directly under root with root folder present', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/' }]
      existingFolderPaths = [{ path: '/' }]
      setup()
    })
    it('should not insert any rows (root is implicit)', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(insertedChunks.flat()).to.have.lengthOf(0)
    })
  })

  describe('when a deep picture has all ancestors missing', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/b/c/' }]
      existingFolderPaths = []
      setup()
    })
    it('should insert a row for each missing ancestor', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.have.members(['/a/', '/a/b/', '/a/b/c/'])
    })
    it('should not insert a row for the implicit root', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.not.include('/')
    })
    it('should set the correct parent folder on each inserted row', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/']?.folder).to.equal('/a/')
    })
    it('should set the parent to root for a top-level ancestor', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/']?.folder).to.equal('/')
    })
    it('should derive sortKey from the folder basename', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      const rowsByPath = Object.fromEntries(insertedChunks.flat().map((r) => [r.path, r]))
      expect(rowsByPath['/a/b/c/']?.sortKey).to.equal(Functions.ToSortKey('c'))
    })
    it('should log the number of ancestors added', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.firstCall.args[0]).to.equal('Added 3 missing ancestor folders')
    })
    it('should use onConflict on path when inserting', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.onConflict.firstCall.args).to.deep.equal(['path'])
    })
    it('should use ignore (not merge) when inserting', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.ignore.callCount).to.be.above(0)
    })
  })

  describe('when some ancestors already exist', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/b/c/' }]
      existingFolderPaths = [{ path: '/a/' }, { path: '/a/b/c/' }]
      setup()
    })
    it('should only insert the missing ancestor', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.deep.equal(['/a/b/'])
    })
    it('should log the number of ancestors actually added', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.firstCall.args[0]).to.equal('Added 1 missing ancestor folders')
    })
  })

  describe('when all ancestor candidates already exist', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/' }]
      existingFolderPaths = [{ path: '/a/' }]
      setup()
    })
    it('should not call insert', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
    it('should log zero ancestors added', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(loggerStub.firstCall.args[0]).to.equal('Added 0 missing ancestor folders')
    })
  })

  describe('when multiple leaf folders share ancestors', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/b/c/' }, { folder: '/a/b/d/' }]
      existingFolderPaths = []
      setup()
    })
    it('should de-duplicate the shared ancestors', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      const paths = insertedChunks.flat().map((r) => r.path)
      expect(paths).to.have.members(['/a/', '/a/b/', '/a/b/c/', '/a/b/d/'])
    })
  })

  describe('query shape', () => {
    beforeEach(() => {
      distinctPictureFolders = [{ folder: '/a/' }]
      existingFolderPaths = []
      setup()
    })
    it('should query pictures once for distinct folders', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(knexFnStub.withArgs('pictures').callCount).to.equal(1)
    })
    it('should call distinct with folder column', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(picturesQuery.distinct.firstCall.args).to.deep.equal(['folder'])
    })
    it('should exclude null folders from the picture query', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(picturesQuery.whereNotNull.firstCall.args).to.deep.equal(['folder'])
    })
    it('should look up existing folder paths with whereIn', async () => {
      await Functions.SyncMissingAncestorFolders(loggerFake, knexFnFake)
      expect(whereInCalls.flat()).to.include('/a/')
    })
  })
})
