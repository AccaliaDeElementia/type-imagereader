'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'
import type { Changeset } from '#utils/filewatcher'

const sandbox = Sinon.createSandbox()

describe('utils/incrementalsync function IncrementalSync()', () => {
  let loggerStub = Sinon.stub()
  let incrementalAddStub = Sinon.stub()
  let incrementalRemoveStub = Sinon.stub()
  let incrementalRemoveFolderStub = Sinon.stub()
  let incrementalScanFolderStub = Sinon.stub()
  let incrementalUpdateFoldersStub = Sinon.stub()
  let incrementalUpdateFirstImagesStub = Sinon.stub()
  let knexFnStub = Sinon.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    incrementalAddStub = sandbox.stub(Functions, 'IncrementalAddPicture').resolves()
    incrementalRemoveStub = sandbox.stub(Functions, 'IncrementalRemovePicture').resolves()
    incrementalRemoveFolderStub = sandbox.stub(Functions, 'IncrementalRemoveFolder').resolves()
    incrementalScanFolderStub = sandbox.stub(Functions, 'IncrementalScanFolder').resolves()
    incrementalUpdateFoldersStub = sandbox.stub(Functions, 'IncrementalUpdateFolders').resolves()
    incrementalUpdateFirstImagesStub = sandbox.stub(Functions, 'IncrementalUpdateFirstImages').resolves()
    knexFnStub = Sinon.stub()
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should call IncrementalAddPicture once for create entry', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalAddStub.callCount).to.equal(1)
  })

  it('should pass path to IncrementalAddPicture for create entry', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalAddStub.firstCall.args[1]).to.equal('/comics/page.jpg')
  })

  it('should call IncrementalRemovePicture once for delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveStub.callCount).to.equal(1)
  })

  it('should pass path to IncrementalRemovePicture for delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveStub.firstCall.args[1]).to.equal('/comics/page.jpg')
  })

  it('should call IncrementalRemoveFolder once for dir-delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/series/', 'dir-delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.callCount).to.equal(1)
  })

  it('should pass path to IncrementalRemoveFolder for dir-delete entry', async () => {
    const changeset: Changeset = new Map([['/comics/series/', 'dir-delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.firstCall.args[2]).to.equal('/comics/series/')
  })

  it('should call IncrementalScanFolder once for dir-create entry', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.callCount).to.equal(1)
  })

  it('should pass path to IncrementalScanFolder for dir-create entry', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.firstCall.args[2]).to.equal('/comics/new/')
  })

  it('should pass dataDir to IncrementalScanFolder', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await Functions.IncrementalSync(knexFnFake, changeset, '/mnt/data')
    expect(incrementalScanFolderStub.firstCall.args[3]).to.equal('/mnt/data')
  })

  it('should add dir-delete path to affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/series/', 'dir-delete'],
      ['/photos/new/', 'dir-create'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/comics/series/')).to.equal(true)
  })

  it('should add dir-create path to affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/series/', 'dir-delete'],
      ['/photos/new/', 'dir-create'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/photos/new/')).to.equal(true)
  })

  it('should process dir-deletes before file-deletes', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'delete'],
      ['/old/', 'dir-delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.calledBefore(incrementalRemoveStub)).to.equal(true)
  })

  it('should process file-deletes before dir-creates', async () => {
    const changeset: Changeset = new Map([
      ['/new/', 'dir-create'],
      ['/comics/page.jpg', 'delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveStub.calledBefore(incrementalScanFolderStub)).to.equal(true)
  })

  it('should process dir-creates before file-creates', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/new/', 'dir-create'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.calledBefore(incrementalAddStub)).to.equal(true)
  })

  it('should call IncrementalUpdateFolders once', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFoldersStub.callCount).to.equal(1)
  })

  it('should include create folder in affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/comics/')).to.equal(true)
  })

  it('should include delete folder in affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/photos/')).to.equal(true)
  })

  it('should call IncrementalUpdateFirstImages', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFirstImagesStub.callCount).to.equal(1)
  })

  it('should call IncrementalUpdateFirstImages after IncrementalUpdateFolders', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFoldersStub.calledBefore(incrementalUpdateFirstImagesStub)).to.equal(true)
  })

  it('should not call IncrementalAddPicture for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalAddStub.callCount).to.equal(0)
  })

  it('should not call IncrementalRemovePicture for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveStub.callCount).to.equal(0)
  })

  it('should not call IncrementalRemoveFolder for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.callCount).to.equal(0)
  })

  it('should not call IncrementalScanFolder for empty changeset', async () => {
    const changeset: Changeset = new Map()
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.callCount).to.equal(0)
  })

  it('should log start message', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(loggerStub.firstCall.args[0]).to.equal('Processing 1 incremental changes')
  })

  it('should log completion message', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(loggerStub.lastCall.args[0]).to.equal('Incremental sync complete')
  })

  it('should use / as folder for root-level create path', async () => {
    const changeset: Changeset = new Map([['/image.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should use / as folder for root-level delete path', async () => {
    const changeset: Changeset = new Map([['/image.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include immediate parent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/c/')).to.equal(true)
  })

  it('should include grandparent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include great-grandparent folder of a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/')).to.equal(true)
  })

  it('should include root folder when adding a deep create path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include immediate parent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/c/')).to.equal(true)
  })

  it('should include grandparent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include great-grandparent folder of a deep delete path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/')).to.equal(true)
  })

  it('should include root folder when deleting a deep path', async () => {
    const changeset: Changeset = new Map([['/a/b/c/pic.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include parent of a deleted directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include grandparent of a deleted directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/')).to.equal(true)
  })

  it('should include root when deleting a deep directory', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should include parent of a created directory in affected folders', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/a/b/')).to.equal(true)
  })

  it('should include root when creating a deep directory', async () => {
    const changeset: Changeset = new Map([['/a/b/c/', 'dir-create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })

  it('should log batched progress for file deletes', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
      ['/comics/page3.jpg', 'delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const logCalls = loggerStub.args.map((a: string[]) => a[0])
    expect(logCalls).to.include('Incremental remove: 1 of 3 pictures')
  })

  it('should not log every individual file delete', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page1.jpg', 'delete'],
      ['/comics/page2.jpg', 'delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const logCalls = loggerStub.args.map((a: string[]) => a[0])
    const removeMessages = logCalls.filter(
      (msg?: string) => typeof msg === 'string' && msg.startsWith('Incremental remove:'),
    )
    expect(removeMessages).to.have.lengthOf(1)
  })
})
