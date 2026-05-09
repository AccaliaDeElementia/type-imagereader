'use sanity'

import { expect } from 'chai'
import { incrementalSync, Internals, Imports } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import type { Changeset } from '#sync/filewatcher.js'

const sandbox = Sinon.createSandbox()

describe('sync/incrementalsync incrementalSync()', () => {
  let loggerStub = sandbox.stub()
  let incrementalAddBulkStub = sandbox.stub()
  let incrementalRemoveBulkStub = sandbox.stub()
  let incrementalRemoveFolderStub = sandbox.stub()
  let incrementalScanFolderStub = sandbox.stub()
  let incrementalEnsureAncestorsStub = sandbox.stub()
  let incrementalUpdateFoldersStub = sandbox.stub()
  let incrementalUpdateFirstImagesStub = sandbox.stub()
  let knexFnStub = sandbox.stub()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ loggerStub } = stubDebug(sandbox, Imports))
    incrementalAddBulkStub = sandbox.stub(Internals, 'incrementalAddPicturesBulk').resolves()
    incrementalRemoveBulkStub = sandbox.stub(Internals, 'incrementalRemovePicturesBulk').resolves()
    incrementalRemoveFolderStub = sandbox.stub(Internals, 'incrementalRemoveFolder').resolves()
    incrementalScanFolderStub = sandbox.stub(Internals, 'incrementalScanFolder').resolves()
    incrementalEnsureAncestorsStub = sandbox.stub(Internals, 'incrementalEnsureAncestors').resolves()
    incrementalUpdateFoldersStub = sandbox.stub(Internals, 'incrementalUpdateFolders').resolves()
    incrementalUpdateFirstImagesStub = sandbox.stub(Internals, 'incrementalUpdateFirstImages').resolves()
    knexFnStub = sandbox.stub()
    knexFnFake = stubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should call incrementalAddPicturesBulk once for any number of create entries', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'create'],
      ['/comics/page2.jpg', 'create'],
      ['/comics/page3.jpg', 'create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalAddBulkStub.callCount).to.equal(1)
  })

  it('should pass all create paths in a single bulk call', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'create'],
      ['/comics/page2.jpg', 'create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalAddBulkStub.firstCall.args[1]).to.deep.equal(['/comics/page1.jpg', '/comics/page2.jpg'])
  })

  it('should call incrementalRemovePicturesBulk once for any number of delete entries', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
      ['/comics/page3.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveBulkStub.callCount).to.equal(1)
  })

  it('should pass all delete paths in a single bulk call', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveBulkStub.firstCall.args[1]).to.deep.equal(['/comics/page1.jpg', '/comics/page2.jpg'])
  })

  it('should call incrementalRemoveFolder once for dir-delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/series/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.callCount).to.equal(1)
  })

  it('should pass path to incrementalRemoveFolder for dir-delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/series/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.firstCall.args[2]).to.equal('/comics/series/')
  })

  it('should call incrementalScanFolder once for dir-create entry', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.callCount).to.equal(1)
  })

  it('should pass path to incrementalScanFolder for dir-create entry', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.firstCall.args[2]).to.equal('/comics/new/')
  })

  it('should pass dataDir to incrementalScanFolder', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset, '/mnt/data')
    expect(incrementalScanFolderStub.firstCall.args[3]).to.equal('/mnt/data')
  })

  it('should add dir-delete path to affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/series/', 'dir-delete'],
      ['/photos/new/', 'dir-create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/comics/series/')).to.equal(true)
  })

  it('should add dir-create path to affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/series/', 'dir-delete'],
      ['/photos/new/', 'dir-create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/photos/new/')).to.equal(true)
  })

  it('should process dir-deletes before file-deletes', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'delete'],
      ['/old/', 'dir-delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.calledBefore(incrementalRemoveBulkStub)).to.equal(true)
  })

  it('should process file-deletes before dir-creates', async () => {
    const changeset: Changeset = new Map([
      ['/new/', 'dir-create'],
      ['/comics/page.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveBulkStub.calledBefore(incrementalScanFolderStub)).to.equal(true)
  })

  it('should process dir-creates before file-creates', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/new/', 'dir-create'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.calledBefore(incrementalAddBulkStub)).to.equal(true)
  })

  it('should call incrementalEnsureAncestors once', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalEnsureAncestorsStub.callCount).to.equal(1)
  })
  it('should call incrementalEnsureAncestors before incrementalUpdateFolders', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalEnsureAncestorsStub.calledBefore(incrementalUpdateFoldersStub)).to.equal(true)
  })
  it('should pass the affected folders set to incrementalEnsureAncestors', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const ensuredSet = cast<Set<string>>(incrementalEnsureAncestorsStub.firstCall.args[2])
    const updatedSet = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(ensuredSet).to.equal(updatedSet)
  })
  it('should call incrementalUpdateFolders once', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFoldersStub.callCount).to.equal(1)
  })

  it('should include create folder in affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/comics/')).to.equal(true)
  })

  it('should include delete folder in affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/photos/')).to.equal(true)
  })

  it('should call incrementalUpdateFirstImages', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFirstImagesStub.callCount).to.equal(1)
  })

  it('should call incrementalUpdateFirstImages after incrementalUpdateFolders', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFoldersStub.calledBefore(incrementalUpdateFirstImagesStub)).to.equal(true)
  })

  it('should not call incrementalAddPicturesBulk for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalAddBulkStub.callCount).to.equal(0)
  })

  it('should not call incrementalRemovePicturesBulk for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveBulkStub.callCount).to.equal(0)
  })

  it('should not call incrementalRemoveFolder for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.callCount).to.equal(0)
  })

  it('should not call incrementalScanFolder for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await incrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.callCount).to.equal(0)
  })

  it('should log start message', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(loggerStub.firstCall.args[0]).to.equal('Processing 1 incremental changes')
  })

  it('should log completion message', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    expect(loggerStub.lastCall.args[0]).to.equal('Incremental sync complete')
  })

  it('should use / as folder for root-level create path', async () => {
    const changeset: Changeset = new Map([['/image.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should use / as folder for root-level delete path', async () => {
    const changeset: Changeset = new Map([['/image.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include immediate parent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/c/')).to.equal(true)
  })

  it('should include grandparent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include great-grandparent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/')).to.equal(true)
  })

  it('should include root folder when adding a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include immediate parent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/c/')).to.equal(true)
  })

  it('should include grandparent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include great-grandparent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/')).to.equal(true)
  })

  it('should include root folder when deleting a deep path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include parent of a deleted directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include grandparent of a deleted directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/')).to.equal(true)
  })

  it('should include root when deleting a deep directory', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include parent of a created directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include root when creating a deep directory', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-create']])
    await incrementalSync(knexFnFake, changeset)
    const affectedFolders = cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should log a single summary line for bulk file deletes', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
      ['/comics/page3.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const logCalls = loggerStub.args.map((a: string[]) => a[0])
    expect(logCalls).to.include('Incremental remove: 3 pictures')
  })

  it('should not log every individual file delete', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
    ])
    await incrementalSync(knexFnFake, changeset)
    const logCalls = loggerStub.args.map((a: string[]) => a[0])
    const removeMessages = logCalls.filter(
      (msg?: string) => typeof msg === 'string' && msg.startsWith('Incremental remove:'),
    )
    expect(removeMessages).to.have.lengthOf(1)
  })
})
