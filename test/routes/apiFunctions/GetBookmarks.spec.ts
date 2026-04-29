'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#routes/apiFunctions'
import { createKnexChainFake } from '#testutils/Knex'
import assert from 'node:assert'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions function GetBookmarks', () => {
  let {
    instance: knexInstance,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['select', 'join'] as const, ['orderBy'] as const)
  let loggerStub: Sinon.SinonStub = sandbox.stub()
  beforeEach(() => {
    ;({
      instance: knexInstance,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['select', 'join'] as const, ['orderBy'] as const))
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should select results from bookmarks once', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexStub.callCount).to.equal(1)
  })
  it('should select results from bookmarks table', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexStub.firstCall.args).to.deep.equal(['bookmarks'])
  })
  it('should select expected fields from bookmarks once', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.select.callCount).to.equal(1)
  })
  it('should select expected number of fields from bookmarks', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.select.firstCall.args).to.have.lengthOf(2)
  })
  it('should select pictures.path from bookmarks', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.select.firstCall.args).to.include('pictures.path')
  })
  it('should select pictures.folder from bookmarks', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.select.firstCall.args).to.include('pictures.folder')
  })
  it('should join pictures to bookmarks at least once', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.join.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should join pictures to bookmarks with expected args', async () => {
    await Functions.GetBookmarks(knexFake)
    const call = knexInstance.join.getCalls().find((call) => call.args[0] === 'pictures')
    assert(call !== undefined)
    expect(call.args).to.deep.equal(['pictures', 'pictures.path', 'bookmarks.path'])
  })
  it('should join folders to bookmarks at least once', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.join.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should join folders to bookmarks with expected args', async () => {
    await Functions.GetBookmarks(knexFake)
    const call = knexInstance.join.getCalls().find((call) => call.args[0] === 'folders')
    assert(call !== undefined)
    expect(call.args).to.deep.equal(['folders', 'folders.path', 'pictures.folder'])
  })
  it('should order strictly by folder then picture once', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.orderBy.callCount).to.equal(1)
  })
  it('should order strictly by folder then picture with one arg', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.orderBy.firstCall.args).to.have.lengthOf(1)
  })
  it('should order strictly by folder then picture including sortkey and paths', async () => {
    await Functions.GetBookmarks(knexFake)
    expect(knexInstance.orderBy.firstCall.args[0]).to.deep.equal([
      'folders.path',
      'folders.sortKey',
      'pictures.sortKey',
      'pictures.path',
    ])
  })
  it('should include the only bookmark folder in results', async () => {
    knexInstance.orderBy.resolves([{ path: '/foo/bar/quux.png', folder: '/foo/bar/' }])
    const bookmarks = await Functions.GetBookmarks(knexFake)
    expect(bookmarks).to.have.lengthOf(1)
    expect(bookmarks[0]).to.deep.equal({
      name: '/foo/bar/',
      path: '/foo/bar/',
      bookmarks: [{ name: 'quux.png', path: '/foo/bar/quux.png', folder: '/foo/bar/' }],
    })
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
  it('should log a bookmark and folder count summary', async () => {
    knexInstance.orderBy.resolves([{ path: '/foo/bar/quux.png', folder: '/foo/bar/' }])
    await Functions.GetBookmarks(knexFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GetBookmarks'))
    expect(matched).to.equal(true)
  })
})
