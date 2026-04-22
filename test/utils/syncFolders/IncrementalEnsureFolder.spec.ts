'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalEnsureFolder()', () => {
  let foldersStub = {
    select: sandbox.stub().returnsThis(),
    where: sandbox.stub().returnsThis(),
    first: sandbox.stub().resolves(undefined),
    insert: sandbox.stub().returnsThis(),
    onConflict: sandbox.stub().returnsThis(),
    ignore: sandbox.stub().resolves(),
  }
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(sandbox.stub()))
    foldersStub = {
      select: sandbox.stub().returnsThis(),
      where: sandbox.stub().returnsThis(),
      first: sandbox.stub().resolves(undefined),
      insert: sandbox.stub().returnsThis(),
      onConflict: sandbox.stub().returnsThis(),
      ignore: sandbox.stub().resolves(),
    }
    knexFnStub = sandbox.stub()
    knexFnStub.withArgs('folders').returns(foldersStub)
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should query folders where path matches', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.where.calledWith({ path: '/comics/' })).to.equal(true)
  })

  it('should call first when checking for existing folder', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.first.callCount).to.equal(1)
  })

  it('should not insert if folder already exists', async () => {
    foldersStub.first.resolves({ path: '/comics/' })
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.insert.callCount).to.equal(0)
  })

  it('should insert folder row when it does not exist', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.insert.callCount).to.equal(1)
  })

  it('should set correct parent folder path', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/series/')
    const inserted = Cast<Record<string, unknown>>(foldersStub.insert.firstCall.args[0])
    expect(inserted.folder).to.equal('/comics/')
  })

  it('should set parent to / for top-level folder', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    const inserted = Cast<Record<string, unknown>>(foldersStub.insert.firstCall.args[0])
    expect(inserted.folder).to.equal('/')
  })

  it('should set correct sortKey from folder basename', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    const inserted = Cast<Record<string, unknown>>(foldersStub.insert.firstCall.args[0])
    expect(inserted.sortKey).to.equal(Imports.SyncFunctions.ToSortKey('comics'))
  })

  it('should set correct path on inserted row', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    const inserted = Cast<Record<string, unknown>>(foldersStub.insert.firstCall.args[0])
    expect(inserted.path).to.equal('/comics/')
  })

  it('should call onConflict with path on folder insert', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.onConflict.calledWith('path')).to.equal(true)
  })

  it('should call ignore on folder insert', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.ignore.callCount).to.equal(1)
  })
})
