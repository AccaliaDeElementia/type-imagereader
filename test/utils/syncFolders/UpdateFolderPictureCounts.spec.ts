'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function UpdateFolderPictureCounts()', () => {
  let getFolderInfosWithPicturesStub = Sinon.stub()
  let getAllFolderInfosStub = Sinon.stub()
  let calculateFolderInfosStub = Sinon.stub()
  let chunkStub = Sinon.stub()
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let knexStub = {
    insert: Sinon.stub().returnsThis(),
    onConflict: Sinon.stub().returnsThis(),
    merge: Sinon.stub().resolves(),
  }
  let knexFnStub = Sinon.stub().returns(knexStub)
  let knexFnFake = StubToKnex(knexFnStub)
  beforeEach(() => {
    knexStub = {
      insert: Sinon.stub().returnsThis(),
      onConflict: Sinon.stub().returnsThis(),
      merge: Sinon.stub().resolves(),
    }
    knexFnStub = Sinon.stub().returns(knexStub)
    knexFnFake = StubToKnex(knexFnStub)
    loggerStub = Sinon.stub()
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    getFolderInfosWithPicturesStub = Sinon.stub(Functions, 'GetFolderInfosWithPictures').resolves([])
    getAllFolderInfosStub = Sinon.stub(Functions, 'GetAllFolderInfos').resolves({})
    calculateFolderInfosStub = Sinon.stub(Functions, 'CalculateFolderInfos').returns([])
    chunkStub = Sinon.stub(Functions, 'Chunk').returns([])
  })
  afterEach(() => {
    debugStub.restore()
    getFolderInfosWithPicturesStub.restore()
    getAllFolderInfosStub.restore()
    calculateFolderInfosStub.restore()
    chunkStub.restore()
  })
  it('should construct prefixed logger', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(debugStub.callCount).to.equal(1)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(Imports.logPrefix + ':'), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':updateSeen'), 'Logger should be suffixed with `updateSeen`')
  })
  it('should use knex to get folders with pictures counts', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getFolderInfosWithPicturesStub.callCount).to.equal(1)
    expect(getFolderInfosWithPicturesStub.firstCall.args).to.have.lengthOf(1)
    expect(getFolderInfosWithPicturesStub.firstCall.args[0]).to.equal(knexFnFake)
  })
  it('should use knex to all folders in the db', async () => {
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(getAllFolderInfosStub.callCount).to.equal(1)
    expect(getAllFolderInfosStub.firstCall.args).to.have.lengthOf(1)
    expect(getAllFolderInfosStub.firstCall.args[0]).to.equal(knexFnFake)
  })
  it('should calculate folder infos using results from both', async () => {
    const pictureFolders = [{ path: 'Test Path', totalCount: 0, seenCount: 0 }]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(calculateFolderInfosStub.callCount).to.equal(1)
    expect(calculateFolderInfosStub.firstCall.args).to.have.lengthOf(2)
    expect(calculateFolderInfosStub.firstCall.args[0]).to.equal(allFolders)
    expect(calculateFolderInfosStub.firstCall.args[1]).to.equal(pictureFolders)
  })
  it('should chunk the results of calculation', async () => {
    const results = [{ path: 'SOME PATH', totalCount: 0, seenCount: 0 }]
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(chunkStub.callCount).to.equal(1)
    expect(chunkStub.firstCall.args).to.have.lengthOf(1)
    expect(chunkStub.firstCall.args[0]).to.equal(results)
  })
  it('should insert results with conflict resolution', async () => {
    const records = [[{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }]]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
    expect(knexStub.insert.callCount).to.equal(1)
    expect(knexStub.insert.firstCall.args).to.have.lengthOf(1)
    expect(knexStub.insert.firstCall.args[0]).to.equal(records[0])
    expect(knexStub.onConflict.callCount).to.equal(1)
    expect(knexStub.onConflict.firstCall.args).to.have.lengthOf(1)
    expect(knexStub.onConflict.firstCall.args[0]).to.equal('path')
    expect(knexStub.merge.callCount).to.equal(1)
    expect(knexStub.merge.firstCall.args).to.have.lengthOf(0)
  })
  it('should loop on insert for each chunk', async () => {
    const records = [
      [{ path: 'SOME PATH', totalCount: 42, seenCount: 69 }],
      [{ path: 'OTHER PATH', totalCount: 420, seenCount: 64 }],
      [{ path: 'LAST PATH', totalCount: 255, seenCount: 128 }],
    ]
    chunkStub.returns(records)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(knexStub.insert.callCount).to.equal(3)
    expect(knexStub.insert.firstCall.args).to.have.lengthOf(1)
    expect(knexStub.insert.firstCall.args[0]).to.equal(records[0])
    expect(knexStub.insert.secondCall.args).to.have.lengthOf(1)
    expect(knexStub.insert.secondCall.args[0]).to.equal(records[1])
    expect(knexStub.insert.thirdCall.args).to.have.lengthOf(1)
    expect(knexStub.insert.thirdCall.args[0]).to.equal(records[2])
  })
  it('should log status', async () => {
    const pictureFolders = [
      { path: 'Test Path', totalCount: 0, seenCount: 0 },
      { path: 'Path under test', totalCount: 0, seenCount: 0 },
    ]
    getFolderInfosWithPicturesStub.resolves(pictureFolders)
    const allFolders = {
      'Test Path': { path: 'Test Path', totalCount: 0, seenCount: 0 },
    }
    getAllFolderInfosStub.resolves(allFolders)
    const results = [
      { path: 'SOME PATH', totalCount: 0, seenCount: 0 },
      { path: 'OTHER PATH', totalCount: 1, seenCount: 1 },
      { path: 'LAST PATH', totalCount: 2, seenCount: 2 },
    ]
    calculateFolderInfosStub.returns(results)
    await Functions.UpdateFolderPictureCounts(knexFnFake)
    expect(loggerStub.callCount).to.equal(5)
    expect(loggerStub.getCall(0).args).to.deep.equal(['Updating Seen Counts'])
    expect(loggerStub.getCall(1).args).to.deep.equal(['Found 2 Folders to Update'])
    expect(loggerStub.getCall(2).args).to.deep.equal(['Found 1 Folders in the DB'])
    expect(loggerStub.getCall(3).args).to.deep.equal(['Calculated 3 Folders Seen Counts'])
    expect(loggerStub.getCall(4).args).to.deep.equal(['Updated 3 Folders Seen Counts'])
  })
})
