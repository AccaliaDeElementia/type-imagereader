'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import { createKnexChainFake } from '../../../testutils/Knex'

describe('utils/syncfolders function GetAllFolderInfos()', () => {
  let {
    instance: knexInstanceStub,
    stub: knexFnStub,
    fake: knexFnFake,
  } = createKnexChainFake([] as const, ['select'] as const)
  beforeEach(() => {
    ;({
      instance: knexInstanceStub,
      stub: knexFnStub,
      fake: knexFnFake,
    } = createKnexChainFake([] as const, ['select'] as const))
  })
  it('should call knex once', async () => {
    await Functions.GetAllFolderInfos(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it("should call knex with 'folders' table", async () => {
    await Functions.GetAllFolderInfos(knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should call select once', async () => {
    await Functions.GetAllFolderInfos(knexFnFake)
    expect(knexInstanceStub.select.callCount).to.equal(1)
  })
  it("should call select with 'path'", async () => {
    await Functions.GetAllFolderInfos(knexFnFake)
    expect(knexInstanceStub.select.firstCall.args).to.deep.equal(['path'])
  })
  it('should resolve to empty array for blank db', async () => {
    const result = await Functions.GetAllFolderInfos(knexFnFake)
    expect(result).to.deep.equal({})
  })
  const folderPaths = ['/', '/foo', '/foo/bar', '/baz', '/quux/is/beast']
  const folderRows = folderPaths.map((path) => ({ path }))
  folderPaths.forEach((folder) => {
    it(`should include key for folder ${folder}`, async () => {
      knexInstanceStub.select.resolves(folderRows)
      const results = await Functions.GetAllFolderInfos(knexFnFake)
      expect(results).to.have.any.keys(folder)
    })
    it(`should set correct info for folder ${folder}`, async () => {
      knexInstanceStub.select.resolves(folderRows)
      const results = await Functions.GetAllFolderInfos(knexFnFake)
      expect(results[folder]).to.deep.equal({ path: folder, totalCount: 0, seenCount: 0 })
    })
  })
})
