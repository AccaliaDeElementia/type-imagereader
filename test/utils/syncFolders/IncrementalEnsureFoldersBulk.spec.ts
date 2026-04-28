'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

interface FolderRow {
  folder: string
  path: string
  sortKey: string
}

describe('utils/incrementalsync function IncrementalEnsureFoldersBulk()', () => {
  let folderChunks: FolderRow[][] = []
  let foldersInsertQuery = {
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    ignore: sandbox.stub().resolves(),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  const setup = (): void => {
    folderChunks = []
    foldersInsertQuery = {
      insert: sandbox.stub().callsFake((chunk: FolderRow[]) => {
        folderChunks.push(chunk)
        return foldersInsertQuery
      }),
      onConflict: sandbox.stub().returnsThis(),
      ignore: sandbox.stub().resolves(),
    }
    knexFnStub = sandbox.stub().callsFake((table: string) => {
      if (table === 'folders') return foldersInsertQuery
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = StubToKnex(knexFnStub)
  }

  beforeEach(() => {
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(sandbox.stub()))
    setup()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('when given an empty list', () => {
    it('should not call folders.insert', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, [])
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
  })

  describe('when given only the root folder', () => {
    it('should not call folders.insert (root sentinel is implicit)', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/'])
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
  })

  describe('when given a single non-root folder', () => {
    it('should bulk-insert one folder row', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()).to.have.lengthOf(1)
    })
    it('should set the folder row path to the supplied folder', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.path).to.equal('/comics/')
    })
    it('should set the folder row parent to / for a top-level folder', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.folder).to.equal('/')
    })
    it('should set the folder row parent to the immediate parent for a nested folder', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/series/'])
      expect(folderChunks.flat()[0]?.folder).to.equal('/comics/')
    })
    it('should derive sortKey from the folder basename', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.sortKey).to.equal(Imports.SyncFunctions.ToSortKey('comics'))
    })
    it('should call onConflict with path', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(foldersInsertQuery.onConflict.firstCall.args).to.deep.equal(['path'])
    })
    it('should call ignore (not merge)', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(foldersInsertQuery.ignore.callCount).to.be.above(0)
    })
  })

  describe('when given duplicate folders', () => {
    it('should de-duplicate and insert each folder once', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/a/', '/a/', '/b/'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths.filter((p) => p === '/a/')).to.have.lengthOf(1)
    })
  })

  describe('when given a mix of root and non-root folders', () => {
    it('should drop root and insert only the non-root folders', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/', '/a/', '/b/'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths).to.have.members(['/a/', '/b/'])
    })
  })

  describe('when given many folders', () => {
    it('should issue one bulk insert call for the chunk', async () => {
      await Functions.IncrementalEnsureFoldersBulk(knexFnFake, ['/a/', '/b/', '/c/'])
      expect(foldersInsertQuery.insert.callCount).to.equal(1)
    })
  })
})
