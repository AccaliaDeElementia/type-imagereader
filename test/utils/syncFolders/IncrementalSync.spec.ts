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

  it('should call IncrementalAddPicture for create entries', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalAddStub.callCount).to.equal(1)
    expect(incrementalAddStub.firstCall.args[2]).to.equal('/comics/page.jpg')
  })

  it('should call IncrementalRemovePicture for delete entries', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveStub.callCount).to.equal(1)
    expect(incrementalRemoveStub.firstCall.args[2]).to.equal('/comics/page.jpg')
  })

  it('should call IncrementalRemoveFolder for dir-delete entries', async () => {
    const changeset: Changeset = new Map([['/comics/series/', 'dir-delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalRemoveFolderStub.callCount).to.equal(1)
    expect(incrementalRemoveFolderStub.firstCall.args[2]).to.equal('/comics/series/')
  })

  it('should call IncrementalScanFolder for dir-create entries', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalScanFolderStub.callCount).to.equal(1)
    expect(incrementalScanFolderStub.firstCall.args[2]).to.equal('/comics/new/')
  })

  it('should pass dataDir to IncrementalScanFolder', async () => {
    const changeset: Changeset = new Map([['/comics/new/', 'dir-create']])
    await Functions.IncrementalSync(knexFnFake, changeset, '/mnt/data')
    expect(incrementalScanFolderStub.firstCall.args[3]).to.equal('/mnt/data')
  })

  it('should add directory paths to affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/series/', 'dir-delete'],
      ['/photos/new/', 'dir-create'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/comics/series/')).to.equal(true)
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

  it('should call IncrementalUpdateFolders with affected folders', async () => {
    const changeset: Changeset = new Map([
      ['/comics/page.jpg', 'create'],
      ['/photos/trip.png', 'delete'],
    ])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalUpdateFoldersStub.callCount).to.equal(1)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/comics/')).to.equal(true)
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

  it('should handle empty changeset', async () => {
    const changeset: Changeset = new Map()
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalAddStub.callCount).to.equal(0)
    expect(incrementalRemoveStub.callCount).to.equal(0)
    expect(incrementalRemoveFolderStub.callCount).to.equal(0)
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
})
