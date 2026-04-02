'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'
import type { Changeset } from '#utils/filewatcher'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalSync()', () => {
  let loggerStub = Sinon.stub()
  let incrementalAddStub = Sinon.stub()
  let incrementalRemoveStub = Sinon.stub()
  let incrementalUpdateFoldersStub = Sinon.stub()
  let knexFnStub = Sinon.stub()
  let picturesStub = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    orderBy: Sinon.stub().returnsThis(),
    first: Sinon.stub().resolves({ path: '/comics/page1.jpg' }),
  }
  let foldersStub = {
    where: Sinon.stub().returnsThis(),
    update: Sinon.stub().resolves(),
  }
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    incrementalAddStub = sandbox.stub(Functions, 'IncrementalAddPicture').resolves()
    incrementalRemoveStub = sandbox.stub(Functions, 'IncrementalRemovePicture').resolves()
    incrementalUpdateFoldersStub = sandbox.stub(Functions, 'IncrementalUpdateFolders').resolves()
    picturesStub = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      orderBy: Sinon.stub().returnsThis(),
      first: Sinon.stub().resolves({ path: '/comics/page1.jpg' }),
    }
    foldersStub = {
      where: Sinon.stub().returnsThis(),
      update: Sinon.stub().resolves(),
    }
    knexFnStub = Sinon.stub()
    knexFnStub.withArgs('pictures').returns(picturesStub)
    knexFnStub.withArgs('folders').returns(foldersStub)
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

  it('should update firstPicture for affected folders', async () => {
    const changeset: Changeset = new Map([['/comics/page.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(foldersStub.update.called).to.equal(true)
    expect(foldersStub.update.firstCall.args[0]).to.deep.equal({ firstPicture: '/comics/page1.jpg' })
  })

  it('should not update firstPicture when folder has no pictures', async () => {
    picturesStub.first.resolves(undefined)
    const changeset: Changeset = new Map([['/comics/page.jpg', 'delete']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(foldersStub.update.called).to.equal(false)
  })

  it('should handle empty changeset', async () => {
    const changeset: Changeset = new Map()
    await Functions.IncrementalSync(knexFnFake, changeset)
    expect(incrementalAddStub.callCount).to.equal(0)
    expect(incrementalRemoveStub.callCount).to.equal(0)
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

  it('should use / as folder for root-level path', async () => {
    const changeset: Changeset = new Map([['/image.jpg', 'create']])
    await Functions.IncrementalSync(knexFnFake, changeset)
    const affectedFolders = Cast<Set<string>>(incrementalUpdateFoldersStub.firstCall.args[2])
    expect(affectedFolders.has('/')).to.equal(true)
  })
})
