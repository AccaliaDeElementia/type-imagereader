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
  it('should select all paths from folders table', async () => {
    await Functions.GetAllFolderInfos(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
    expect(knexInstanceStub.select.callCount).to.equal(1)
    expect(knexInstanceStub.select.firstCall.args).to.deep.equal(['path'])
  })
  it('should resolve to empty array for blank db', async () => {
    const result = await Functions.GetAllFolderInfos(knexFnFake)
    expect(result).to.deep.equal({})
  })
  it('should add path to result for each folder', async () => {
    const folders = ['/', '/foo', '/foo/bar', '/baz', '/quux/is/beast']
    knexInstanceStub.select.resolves(folders.map((path) => ({ path })))
    const results = await Functions.GetAllFolderInfos(knexFnFake)
    for (const folder of folders) {
      expect(results).to.have.any.keys(folder)
      expect(results[folder]).to.deep.equal({
        path: folder,
        totalCount: 0,
        seenCount: 0,
      })
    }
  })
})
