'use sanity'

import { incrementalSync, Internals, Imports } from '#sync/incrementalsync.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import type { Changeset } from '#sync/filewatcher.js'
import type { MockInstance } from 'vitest'

describe('sync/incrementalsync incrementalSync()', () => {
  let loggerStub: MockInstance = vi.fn()
  let incrementalAddBulkStub: MockInstance = vi.fn()
  let incrementalRemoveBulkStub: MockInstance = vi.fn()
  let incrementalRemoveFolderStub: MockInstance = vi.fn()
  let incrementalScanFolderStub: MockInstance = vi.fn()
  let incrementalEnsureAncestorsStub: MockInstance = vi.fn()
  let incrementalUpdateFoldersStub: MockInstance = vi.fn()
  let incrementalUpdateFirstImagesStub: MockInstance = vi.fn()
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ loggerStub } = stubDebug(Imports))
    incrementalAddBulkStub = vi.spyOn(Internals, 'incrementalAddPicturesBulk').mockResolvedValue(undefined)
    incrementalRemoveBulkStub = vi.spyOn(Internals, 'incrementalRemovePicturesBulk').mockResolvedValue(undefined)
    incrementalRemoveFolderStub = vi.spyOn(Internals, 'incrementalRemoveFolder').mockResolvedValue(undefined)
    incrementalScanFolderStub = vi.spyOn(Internals, 'incrementalScanFolder').mockResolvedValue(undefined)
    incrementalEnsureAncestorsStub = vi.spyOn(Internals, 'incrementalEnsureAncestors').mockResolvedValue(undefined)
    incrementalUpdateFoldersStub = vi.spyOn(Internals, 'incrementalUpdateFolders').mockResolvedValue(undefined)
    incrementalUpdateFirstImagesStub = vi.spyOn(Internals, 'incrementalUpdateFirstImages').mockResolvedValue(undefined)
    knexFnStub = vi.fn()
    knexFnFake = stubToKnex(knexFnStub)
  })

  it('should call incrementalAddPicturesBulk once for any number of create entries', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'create'],
      ['/comics/page2.jpg', 'create'],
      ['/comics/page3.jpg', 'create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalAddBulkStub.mock.calls.length).toBe(1)
  })

  it('should pass all create paths in a single bulk call', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'create'],
      ['/comics/page2.jpg', 'create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalAddBulkStub.mock.calls[0]?.[1]).toEqual(['/comics/page1.jpg', '/comics/page2.jpg'])
  })

  it('should call incrementalRemovePicturesBulk once for any number of delete entries', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
      ['/comics/page3.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveBulkStub.mock.calls.length).toBe(1)
  })

  it('should pass all delete paths in a single bulk call', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveBulkStub.mock.calls[0]?.[1]).toEqual(['/comics/page1.jpg', '/comics/page2.jpg'])
  })

  it('should call incrementalRemoveFolder once for dir-delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/series/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.mock.calls.length).toBe(1)
  })

  it('should pass path to incrementalRemoveFolder for dir-delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/series/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.mock.calls[0]?.[2]).toBe('/comics/series/')
  })

  it('should call incrementalScanFolder once for dir-create entry', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.mock.calls.length).toBe(1)
  })

  it('should pass path to incrementalScanFolder for dir-create entry', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.mock.calls[0]?.[2]).toBe('/comics/new/')
  })

  it('should pass dataDir to incrementalScanFolder', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset, '/mnt/data')
    expect(incrementalScanFolderStub.mock.calls[0]?.[3]).toBe('/mnt/data')
  })

  it('should add dir-delete path to affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/series/', 'dir-delete'],
      ['/photos/new/', 'dir-create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/comics/series/')).toBe(true)
  })

  it('should add dir-create path to affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/series/', 'dir-delete'],
      ['/photos/new/', 'dir-create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/photos/new/')).toBe(true)
  })

  it('should process dir-deletes before file-deletes', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'delete'],
      ['/old/', 'dir-delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(
      (incrementalRemoveFolderStub.mock.invocationCallOrder[0] ?? 0) <
        (incrementalRemoveBulkStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })

  it('should process file-deletes before dir-creates', async () => {
    const changeset: Changeset = new Map([
      ['/new/', 'dir-create'],
      ['/comics/page.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(
      (incrementalRemoveBulkStub.mock.invocationCallOrder[0] ?? 0) <
        (incrementalScanFolderStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })

  it('should process dir-creates before file-creates', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/new/', 'dir-create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(
      (incrementalScanFolderStub.mock.invocationCallOrder[0] ?? 0) <
        (incrementalAddBulkStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })

  it('should call incrementalEnsureAncestors once', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalEnsureAncestorsStub.mock.calls.length).toBe(1)
  })
  it('should call incrementalEnsureAncestors before incrementalUpdateFolders', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(
      (incrementalEnsureAncestorsStub.mock.invocationCallOrder[0] ?? 0) <
        (incrementalUpdateFoldersStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })
  it('should pass the affected folders set to incrementalEnsureAncestors', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const ensuredSet = cast<Set<string>>(incrementalEnsureAncestorsStub.mock.calls[0]?.[2])
    const updatedSet = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(ensuredSet).toBe(updatedSet)
  })
  it('should call incrementalUpdateFolders once', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFoldersStub.mock.calls.length).toBe(1)
  })

  it('should include create folder in affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/comics/')).toBe(true)
  })

  it('should include delete folder in affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/photos/')).toBe(true)
  })

  it('should call incrementalUpdateFirstImages', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFirstImagesStub.mock.calls.length).toBe(1)
  })

  it('should call incrementalUpdateFirstImages after incrementalUpdateFolders', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(
      (incrementalUpdateFoldersStub.mock.invocationCallOrder[0] ?? 0) <
        (incrementalUpdateFirstImagesStub.mock.invocationCallOrder[0] ?? 0),
    ).toBe(true)
  })

  it('should not call incrementalAddPicturesBulk for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalAddBulkStub.mock.calls.length).toBe(0)
  })

  it('should not call incrementalRemovePicturesBulk for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveBulkStub.mock.calls.length).toBe(0)
  })

  it('should not call incrementalRemoveFolder for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.mock.calls.length).toBe(0)
  })

  it('should not call incrementalScanFolder for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.mock.calls.length).toBe(0)
  })

  it('should log start message', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(loggerStub.mock.calls[0]?.[0]).toBe('Processing 1 incremental changes')
  })

  it('should log completion message', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(loggerStub.mock.lastCall?.[0]).toBe('Incremental sync complete')
  })

  it('should use / as folder for root-level create path', async () => {
    const changeset: Changeset = new Map([['/image.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/')).toBe(true)
  })

  it('should use / as folder for root-level delete path', async () => {
    const changeset: Changeset = new Map([['/image.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/')).toBe(true)
  })

  it('should include immediate parent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/b/c/')).toBe(true)
  })

  it('should include grandparent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/b/')).toBe(true)
  })

  it('should include great-grandparent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/')).toBe(true)
  })

  it('should include root folder when adding a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/')).toBe(true)
  })

  it('should include immediate parent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/b/c/')).toBe(true)
  })

  it('should include grandparent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/b/')).toBe(true)
  })

  it('should include great-grandparent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/')).toBe(true)
  })

  it('should include root folder when deleting a deep path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/')).toBe(true)
  })

  it('should include parent of a deleted directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/b/')).toBe(true)
  })

  it('should include grandparent of a deleted directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/')).toBe(true)
  })

  it('should include root when deleting a deep directory', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/')).toBe(true)
  })

  it('should include parent of a created directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/a/b/')).toBe(true)
  })

  it('should include root when creating a deep directory', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.mock.calls[0]?.[2])
    expect(affectedFolders.has('/')).toBe(true)
  })

  it('should log a single summary line for bulk file deletes', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
      ['/comics/page3.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const logCalls = loggerStub.mock.calls.map((a) => a[0] as unknown)
    expect(logCalls).toContain('Incremental remove: 3 pictures')
  })

  it('should not log every individual file delete', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const logCalls = loggerStub.mock.calls.map((a) => a[0] as unknown)
    const removeMessages = logCalls.filter(
      (msg: unknown) => typeof msg === 'string' && msg.startsWith('Incremental remove:'),
    )
    expect(removeMessages).toHaveLength(1)
  })
})
