'use sanity'

import { expect } from 'chai'
import { incrementalAddPicturesBulk } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

interface PictureRow {
  folder: string
  path: string
  sortKey: string
  pathHash: string
}
interface FolderRow {
  folder: string
  path: string
  sortKey: string
}

describe('sync/incrementalsync incrementalAddPicturesBulk()', () => {
  let pictureChunks: PictureRow[][] = []
  let folderChunks: FolderRow[][] = []

  let picturesInsertQuery = {
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    ignore: sandbox.stub().resolves(),
  }
  let foldersInsertQuery = {
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    ignore: sandbox.stub().resolves(),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = stubToKnex(knexFnStub)

  const setup = (): void => {
    pictureChunks = []
    folderChunks = []
    picturesInsertQuery = {
      insert: sandbox.stub().callsFake((chunk: PictureRow[]) => {
        pictureChunks.push(chunk)
        return picturesInsertQuery
      }),
      onConflict: sandbox.stub().returnsThis(),
      ignore: sandbox.stub().resolves(),
    }
    foldersInsertQuery = {
      insert: sandbox.stub().callsFake((chunk: FolderRow[]) => {
        folderChunks.push(chunk)
        return foldersInsertQuery
      }),
      onConflict: sandbox.stub().returnsThis(),
      ignore: sandbox.stub().resolves(),
    }
    knexFnStub = sandbox.stub().callsFake((table: string) => {
      if (table === 'pictures') return picturesInsertQuery
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

  describe('when given an empty list of paths', () => {
    it('should not call pictures.insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, [])
      expect(picturesInsertQuery.insert.callCount).to.equal(0)
    })
    it('should not call folders.insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, [])
      expect(foldersInsertQuery.insert.callCount).to.equal(0)
    })
  })

  describe('when given a single picture path', () => {
    it('should bulk-insert one picture row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()).to.have.lengthOf(1)
    })
    it('should derive the picture row folder from the parent directory', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.folder).to.equal('/comics/')
    })
    it('should preserve the picture row path verbatim', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.path).to.equal('/comics/page.jpg')
    })
    it('should populate a non-empty pathHash for the picture row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.pathHash.length).to.be.above(0)
    })
    it('should populate a sortKey for the picture row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.sortKey).to.be.a('string')
    })
    it('should call onConflict with path on the picture insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(picturesInsertQuery.onConflict.firstCall.args).to.deep.equal(['path'])
    })
    it('should call ignore on the picture insert (not merge)', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(picturesInsertQuery.ignore.callCount).to.be.above(0)
    })
    it('should bulk-insert one folder row for the parent folder', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(folderChunks.flat().map((r) => r.path)).to.include('/comics/')
    })
    it('should call onConflict with path on the folder insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(foldersInsertQuery.onConflict.firstCall.args).to.deep.equal(['path'])
    })
    it('should call ignore on the folder insert (not merge)', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(foldersInsertQuery.ignore.callCount).to.be.above(0)
    })
  })

  describe('when given multiple picture paths under the same folder', () => {
    it('should bulk-insert one picture row per path', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page1.jpg', '/comics/page2.jpg', '/comics/page3.jpg'])
      expect(pictureChunks.flat()).to.have.lengthOf(3)
    })
    it('should issue exactly one pictures.insert call (single chunk)', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page1.jpg', '/comics/page2.jpg', '/comics/page3.jpg'])
      expect(picturesInsertQuery.insert.callCount).to.equal(1)
    })
    it('should de-duplicate the parent folder row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page1.jpg', '/comics/page2.jpg', '/comics/page3.jpg'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths.filter((p) => p === '/comics/')).to.have.lengthOf(1)
    })
  })

  describe('when given paths under different folders', () => {
    it('should produce a folder row for each distinct parent', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/a/page.jpg', '/b/page.jpg'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths).to.have.members(['/a/', '/b/'])
    })
  })

  describe('when given a root-level picture path', () => {
    it('should set the picture row folder to /', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/image.jpg'])
      expect(pictureChunks.flat()[0]?.folder).to.equal('/')
    })
    it('should not insert a folder row for the root sentinel', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/image.jpg'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths).to.not.include('/')
    })
  })
})
