'use sanity'

import { incrementalAddPicturesBulk } from '#sync/incrementalsync.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

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
    insert: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    onConflict: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    ignore: vi.fn().mockResolvedValue(undefined),
  }
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
    pictureChunks = []
    folderChunks = []
    picturesInsertQuery = {
      insert: vi.fn().mockImplementation((chunk: PictureRow[]) => {
        pictureChunks.push(chunk)
        return picturesInsertQuery
      }),
      onConflict: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      ignore: vi.fn().mockResolvedValue(undefined),
    }
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
      if (table === 'pictures') return picturesInsertQuery
      if (table === 'folders') return foldersInsertQuery
      throw new Error(`Unexpected knex table: ${table}`)
    })
    knexFnFake = stubToKnex(knexFnStub)
  }

  beforeEach(() => {
    setup()
  })

  describe('when given an empty list of paths', () => {
    it('should not call pictures.insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, [])
      expect(picturesInsertQuery.insert.mock.calls.length).toBe(0)
    })
    it('should not call folders.insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, [])
      expect(foldersInsertQuery.insert.mock.calls.length).toBe(0)
    })
  })

  describe('when given a single picture path', () => {
    it('should bulk-insert one picture row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()).toHaveLength(1)
    })
    it('should derive the picture row folder from the parent directory', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.folder).toBe('/comics/')
    })
    it('should preserve the picture row path verbatim', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.path).toBe('/comics/page.jpg')
    })
    it('should populate a non-empty pathHash for the picture row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.pathHash.length).toBeGreaterThan(0)
    })
    it('should populate a sortKey for the picture row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(pictureChunks.flat()[0]?.sortKey).toBeTypeOf('string')
    })
    it('should call onConflict with path on the picture insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(picturesInsertQuery.onConflict.mock.calls[0]).toEqual(['path'])
    })
    it('should call ignore on the picture insert (not merge)', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(picturesInsertQuery.ignore.mock.calls.length).toBeGreaterThan(0)
    })
    it('should bulk-insert one folder row for the parent folder', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(folderChunks.flat().map((r) => r.path)).toContain('/comics/')
    })
    it('should call onConflict with path on the folder insert', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(foldersInsertQuery.onConflict.mock.calls[0]).toEqual(['path'])
    })
    it('should call ignore on the folder insert (not merge)', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page.jpg'])
      expect(foldersInsertQuery.ignore.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('when given multiple picture paths under the same folder', () => {
    it('should bulk-insert one picture row per path', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page1.jpg', '/comics/page2.jpg', '/comics/page3.jpg'])
      expect(pictureChunks.flat()).toHaveLength(3)
    })
    it('should issue exactly one pictures.insert call (single chunk)', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page1.jpg', '/comics/page2.jpg', '/comics/page3.jpg'])
      expect(picturesInsertQuery.insert.mock.calls.length).toBe(1)
    })
    it('should de-duplicate the parent folder row', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/comics/page1.jpg', '/comics/page2.jpg', '/comics/page3.jpg'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths.filter((p) => p === '/comics/')).toHaveLength(1)
    })
  })

  describe('when given paths under different folders', () => {
    it('should produce a folder row for each distinct parent', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/a/page.jpg', '/b/page.jpg'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect([...paths].sort()).toEqual(['/a/', '/b/'].sort())
    })
  })

  describe('when given a root-level picture path', () => {
    it('should set the picture row folder to /', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/image.jpg'])
      expect(pictureChunks.flat()[0]?.folder).toBe('/')
    })
    it('should not insert a folder row for the root sentinel', async () => {
      await incrementalAddPicturesBulk(knexFnFake, ['/image.jpg'])
      const paths = folderChunks.flat().map((r) => r.path)
      expect(paths).not.toContain('/')
    })
  })
})
