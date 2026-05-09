'use sanity'

import { expect } from 'chai'
import { IncrementalEnsureFoldersBulk } from '#sync/incrementalsync.js'
import { ToSortKey } from '#sync/helpers.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/TypeGuards.js'

const sandbox = Sinon.createSandbox()

interface FolderRow {
  folder: string
  path: string
  sortKey: string
}

describe('sync/incrementalsync IncrementalEnsureFoldersBulk()', () => {
  let folderChunks: FolderRow[][] = []
  let foldersInsertQuery = {
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    ignore: sandbox.stub().resolves(),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = stubToKnex(knexFnStub)

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
    knexFnFake = stubToKnex(knexFnStub)
  }

  beforeEach(() => {
    setup()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('when given an empty list', () => {
    it('should not call folders.insert', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, [])
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
  })

  describe('when given only the root folder', () => {
    it('should not call folders.insert (root sentinel is implicit)', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/'])
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
  })

  describe('when given a single non-root folder', () => {
    it('should bulk-insert one folder row', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()).to.have.lengthOf(1)
    })
    it('should set the folder row path to the supplied folder', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.path).to.equal('/comics/')
    })
    it('should set the folder row parent to / for a top-level folder', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.folder).to.equal('/')
    })
    it('should set the folder row parent to the immediate parent for a nested folder', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/series/'])
      expect(folderChunks.flat()[0]?.folder).to.equal('/comics/')
    })
    it('should derive sortKey from the folder basename', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(folderChunks.flat()[0]?.sortKey).to.equal(ToSortKey('comics'))
    })
    it('should call onConflict with path', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(foldersInsertQuery.onConflict.firstCall.args).to.deep.equal(['path'])
    })
    it('should call ignore (not merge)', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/comics/'])
      expect(foldersInsertQuery.ignore.callCount).to.be.above(0)
    })
  })

  describe('when given duplicate folders', () => {
    it('should de-duplicate and insert each folder once', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/a/', '/a/', '/b/'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths.filter((p) => p === '/a/')).to.have.lengthOf(1)
    })
  })

  describe('when given a mix of root and non-root folders', () => {
    it('should drop root and insert only the non-root folders', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/', '/a/', '/b/'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths).to.have.members(['/a/', '/b/'])
    })
  })

  describe('when given many folders', () => {
    it('should issue one bulk insert call for the chunk', async () => {
      await IncrementalEnsureFoldersBulk(knexFnFake, ['/a/', '/b/', '/c/'])
      expect(foldersInsertQuery.insert.callCount).to.equal(1)
    })
  })
})
