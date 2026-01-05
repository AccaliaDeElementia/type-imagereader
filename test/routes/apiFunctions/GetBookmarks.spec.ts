'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'
import assert from 'node:assert'

describe('routes/apiFunctions function GetBookmarks', () => {
  let knexInstance = {
    select: Sinon.stub().returnsThis(),
    join: Sinon.stub().returnsThis(),
    orderBy: Sinon.stub().resolves([]),
  }
  let knexStub = Sinon.stub().returns(knexInstance)
  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexInstance = {
      select: Sinon.stub().returnsThis(),
      join: Sinon.stub().returnsThis(),
      orderBy: Sinon.stub().resolves([]),
    }
    knexStub = Sinon.stub().returns(knexInstance)
    knexFake = StubToKnex(knexStub)
  })
  it('should select results from bookmarks', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['bookmarks'])
  })
  it('should select expected fields from bookmarks', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.have.lengthOf(2)
    expect(knexInstance.select.firstCall.args).to.include('pictures.path')
    expect(knexInstance.select.firstCall.args).to.include('pictures.folder')
  })
  it('should join pictures to bookmarks', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.join.callCount).to.be.greaterThanOrEqual(1)
    const call = knexInstance.join.getCalls().find((call) => call.args[0] === 'pictures')
    assert(call !== undefined)
    expect(call.args).to.deep.equal(['pictures', 'pictures.path', 'bookmarks.path'])
  })
  it('should join folders to bookmarks', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.join.callCount).to.be.greaterThanOrEqual(1)
    const call = knexInstance.join.getCalls().find((call) => call.args[0] === 'folders')
    assert(call !== undefined)
    expect(call.args).to.deep.equal(['folders', 'folders.path', 'pictures.folder'])
  })
  it('should order strictly by folder then picture including sortkey and paths', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.orderBy.callCount).to.equal(1)
    expect(knexInstance.orderBy.firstCall.args).to.have.lengthOf(1)
    expect(knexInstance.orderBy.firstCall.args[0]).to.deep.equal([
      'folders.path',
      'folders.sortKey',
      'pictures.sortKey',
      'pictures.path',
    ])
  })
  it('should resolve to empty with no bookmarks', async () => {
    knexInstance.orderBy.resolves([])
    const bookmarks = await Functions.GetBookmarks(knexFake)
    expect(bookmarks).to.deep.equal([])
  })
  it('should resolve to results with bookmarks', async () => {
    knexInstance.orderBy.resolves([
      { path: '/foo/a bar/a quux.png', folder: '/foo/a bar/' },
      { path: '/foo/a bar/a quuux.png', folder: '/foo/a bar/' },
      { path: '/foo/a baz/a quux.png', folder: '/foo/a baz/' },
    ])
    const expected = [
      {
        name: '/foo/a bar/',
        path: '/foo/a%20bar/',
        bookmarks: [
          {
            name: 'a quux.png',
            path: '/foo/a%20bar/a%20quux.png',
            folder: '/foo/a%20bar/',
          },
          {
            name: 'a quuux.png',
            path: '/foo/a%20bar/a%20quuux.png',
            folder: '/foo/a%20bar/',
          },
        ],
      },
      {
        name: '/foo/a baz/',
        path: '/foo/a%20baz/',
        bookmarks: [
          {
            name: 'a quux.png',
            path: '/foo/a%20baz/a%20quux.png',
            folder: '/foo/a%20baz/',
          },
        ],
      },
    ]
    const bookmarks = await Functions.GetBookmarks(knexFake)
    expect(bookmarks).to.deep.equal(expected)
  })
})
