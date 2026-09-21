'use sanity'

import { getListing, Internals, Imports, ModCount, type ModCountInternals } from '#routes/apiFunctions.js'
import { cast } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'
const modCountInternals = cast<ModCountInternals>(ModCount)
const folderFixture = {
  name: 'bar<=>',
  path: '/foo/bar/',
  folder: '/foo/',
  cover: '/foo/bar/image.png',
  sortKey: 'bar>-<',
}
const folderResolvingToADifferentPathThanRequested = { ...folderFixture, path: '/fop/bat/' }

describe('routes/apiFunctions getListing', () => {
  let getFolderStub: MockInstance = vi.fn()
  let getDirectionFolderStub: MockInstance = vi.fn()
  let getNextFolderStub: MockInstance = vi.fn()
  let getPreviousFolderStub: MockInstance = vi.fn()
  let getChildFoldersStub: MockInstance = vi.fn()
  let getPicturesStub: MockInstance = vi.fn()
  let getBookmarksStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  let { fake: knexFake } = createKnexChainFake([] as const, [] as const)
  beforeEach(() => {
    modCountInternals.modCount = 32_768
    ;({ fake: knexFake } = createKnexChainFake([] as const, [] as const))
    getFolderStub = vi.spyOn(Internals, 'getFolder').mockResolvedValue(null)
    getDirectionFolderStub = vi.spyOn(Internals, 'getDirectionFolder').mockResolvedValue(null)
    getNextFolderStub = vi.spyOn(Internals, 'getNextFolder').mockResolvedValue(null)
    getPreviousFolderStub = vi.spyOn(Internals, 'getPreviousFolder').mockResolvedValue(null)
    getChildFoldersStub = vi.spyOn(Internals, 'getChildFolders').mockResolvedValue([])
    getPicturesStub = vi.spyOn(Internals, 'getPictures').mockResolvedValue([])
    getBookmarksStub = vi.spyOn(Internals, 'getBookmarks').mockResolvedValue([])
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  describe('getFolder() interface', () => {
    it('should call getFolder() once', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.mock.calls.length).toBe(1)
    })
    it('should call getFolder() with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.mock.calls[0]).toHaveLength(2)
    })
    it('should call getFolder() with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('should call getFolder() with path', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getFolderStub.mock.calls[0]?.[1]).toBe('/foo/bar/')
    })
  })

  describe('when getFolder() resolves to null', () => {
    it('should return null', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      expect(result).toBe(null)
    })
    it('should not call getNextFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.mock.calls.length).toBe(0)
    })
    it('should not call getPreviousFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.mock.calls.length).toBe(0)
    })
    it('should not call getChildFolders', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.mock.calls.length).toBe(0)
    })
    it('should not call getPictures', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.mock.calls.length).toBe(0)
    })
    it('should not call getBookmarks', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.mock.calls.length).toBe(0)
    })
    it('should not log getListing timing', async () => {
      await getListing(knexFake, '/foo/bar/')
      const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('getListing'))
      expect(matched).toBe(false)
    })
  })

  describe('when getFolder() resolves to a folder', () => {
    beforeEach(() => {
      getFolderStub.mockResolvedValue(folderFixture)
    })

    it('should call getNextFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getNextFolderStub.mock.calls.length).toBe(1)
    })
    it('should call getPreviousFolder', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPreviousFolderStub.mock.calls.length).toBe(1)
    })
    it('should call getChildFolders', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getChildFoldersStub.mock.calls.length).toBe(1)
    })
    it('should call getPictures', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getPicturesStub.mock.calls.length).toBe(1)
    })
    it('should call getBookmarks', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getBookmarksStub.mock.calls.length).toBe(1)
    })
    it('should log getListing timing', async () => {
      await getListing(knexFake, '/foo/bar/')
      const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('getListing'))
      expect(matched).toBe(true)
    })
  })

  interface DependencyCall {
    name: string
    resolvedFolder: unknown
    stub: () => MockInstance
    expectedArgs: () => unknown[]
  }
  const dependencyCalls: DependencyCall[] = [
    {
      name: 'getNextFolder',
      resolvedFolder: folderResolvingToADifferentPathThanRequested,
      stub: () => getNextFolderStub,
      expectedArgs: () => [knexFake, '/foo/bar/', 'bar>-<'],
    },
    {
      name: 'getPreviousFolder',
      resolvedFolder: folderFixture,
      stub: () => getPreviousFolderStub,
      expectedArgs: () => [knexFake, '/foo/bar/', 'bar>-<'],
    },
    {
      name: 'getChildFolders',
      resolvedFolder: folderFixture,
      stub: () => getChildFoldersStub,
      expectedArgs: () => [knexFake, '/foo/bar/'],
    },
    {
      name: 'getPictures',
      resolvedFolder: folderFixture,
      stub: () => getPicturesStub,
      expectedArgs: () => [knexFake, '/foo/bar/'],
    },
    {
      name: 'getBookmarks',
      resolvedFolder: folderFixture,
      stub: () => getBookmarksStub,
      expectedArgs: () => [knexFake],
    },
  ]
  it.each(dependencyCalls)(
    'should call $name exactly once with its expected arguments',
    async ({ resolvedFolder, stub, expectedArgs }: DependencyCall) => {
      getFolderStub.mockResolvedValue(resolvedFolder)
      await getListing(knexFake, '/foo/bar/')
      expect(stub().mock.calls).toEqual([expectedArgs()])
    },
  )

  describe('getDirectionFolder() calls', () => {
    beforeEach(() => {
      getFolderStub.mockResolvedValue(folderFixture)
    })
    it('should call getDirectionFolder twice', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.mock.calls.length).toBe(2)
    })
    it('should call getDirectionFolder for next unread with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.mock.calls[0]).toHaveLength(2)
    })
    it('should call getDirectionFolder for next unread with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('should call getDirectionFolder for next unread with expected options', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.mock.calls[0]?.[1]).toEqual({
        path: '/foo/bar/',
        sortKey: 'bar>-<',
        direction: 'asc',
        type: 'unread',
      })
    })
    it('should call getDirectionFolder for previous unread with two arguments', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.mock.calls[1]).toHaveLength(2)
    })
    it('should call getDirectionFolder for previous unread with knex', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.mock.calls[1]?.[0]).toBe(knexFake)
    })
    it('should call getDirectionFolder for previous unread with expected options', async () => {
      await getListing(knexFake, '/foo/bar/')
      expect(getDirectionFolderStub.mock.calls[1]?.[1]).toEqual({
        path: '/foo/bar/',
        sortKey: 'bar>-<',
        direction: 'desc',
        type: 'unread',
      })
    })
  })

  describe('resolved folder properties', () => {
    beforeEach(() => {
      getFolderStub.mockResolvedValue(folderResolvingToADifferentPathThanRequested)
    })
    it('should resolve folder name', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.name).toBe('bar<=>')
    })
    it('should resolve folder path', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.path).toBe('/fop/bat/')
    })
    it('should resolve folder parent', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.parent).toBe('/foo/')
    })
    it('should resolve folder cover', async () => {
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.cover).toBe('/foo/bar/image.png')
    })
  })

  describe('downstream helper resolution', () => {
    beforeEach(() => {
      getFolderStub.mockResolvedValue({})
    })
    it('should set next from getNextFolder()', async () => {
      const data = { data: Math.random() }
      getNextFolderStub.mockResolvedValue(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.next).toBe(data)
    })
    it('should set prev from getPreviousFolder()', async () => {
      const data = { data: Math.random() }
      getPreviousFolderStub.mockResolvedValue(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.prev).toBe(data)
    })
    it('should set children from getChildFolders()', async () => {
      const data = { data: Math.random() }
      getChildFoldersStub.mockResolvedValue(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.children).toBe(data)
    })
    it('should set pictures from getPictures()', async () => {
      const data = { data: Math.random() }
      getPicturesStub.mockResolvedValue(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.pictures).toBe(data)
    })
    it('should set bookmarks from getBookmarks()', async () => {
      const data = { data: Math.random() }
      getBookmarksStub.mockResolvedValue(data)
      const result = await getListing(knexFake, '/foo/bar/')
      assert(result !== null)
      expect(result.bookmarks).toBe(data)
    })
  })

  it('should set modcount', async () => {
    getFolderStub.mockResolvedValue({})
    modCountInternals.modCount = 9090
    const result = await getListing(knexFake, '/foo/bar/')
    assert(result !== null)
    expect(result.modCount).toBe(9090)
  })
})
