'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'

describe('utils/syncfolders function GetAllFolderInfos()', () => {
  let knexInstanceStub = {
    select: Sinon.stub().resolves([]),
  }

  let knexFnStub = Sinon.stub().returns(knexInstanceStub)
  let knexFnFake = StubToKnex(knexFnStub)
  beforeEach(() => {
    knexInstanceStub = {
      select: Sinon.stub().resolves([]),
    }

    knexFnStub = Sinon.stub().returns(knexInstanceStub)
    knexFnFake = StubToKnex(knexFnStub)
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
