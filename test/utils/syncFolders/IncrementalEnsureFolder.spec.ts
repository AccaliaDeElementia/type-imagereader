'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalEnsureFolder()', () => {
  let foldersStub = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    first: Sinon.stub().resolves(undefined),
    insert: Sinon.stub().returnsThis(),
    onConflict: Sinon.stub().returnsThis(),
    ignore: Sinon.stub().resolves(),
  }
  let knexFnStub = Sinon.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(Sinon.stub()))
    foldersStub = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      first: Sinon.stub().resolves(undefined),
      insert: Sinon.stub().returnsThis(),
      onConflict: Sinon.stub().returnsThis(),
      ignore: Sinon.stub().resolves(),
    }
    knexFnStub = Sinon.stub()
    knexFnStub.withArgs('folders').returns(foldersStub)
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check if folder already exists', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.where.calledWith({ path: '/comics/' })).to.equal(true)
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

  it('should use onConflict ignore', async () => {
    await Functions.IncrementalEnsureFolder(knexFnFake, '/comics/')
    expect(foldersStub.onConflict.calledWith('path')).to.equal(true)
    expect(foldersStub.ignore.callCount).to.equal(1)
  })
})
