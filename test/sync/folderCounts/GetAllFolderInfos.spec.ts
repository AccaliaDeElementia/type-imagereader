'use sanity'

import { expect } from 'chai'
import { getAllFolderInfos } from '#sync/folderCounts.js'
import { createKnexChainFake } from '#testutils/Knex.js'

describe('sync/folderCounts getAllFolderInfos()', () => {
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
    await getAllFolderInfos(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it("should call knex with 'folders' table", async () => {
    await getAllFolderInfos(knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should call select once', async () => {
    await getAllFolderInfos(knexFnFake)
    expect(knexInstanceStub.select.callCount).to.equal(1)
  })
  it("should call select with 'path', 'folder', 'sortKey' so callers can satisfy NOT NULL on upsert", async () => {
    await getAllFolderInfos(knexFnFake)
    expect(knexInstanceStub.select.firstCall.args).to.deep.equal(['path', 'folder', 'sortKey'])
  })
  it('should resolve to empty array for blank db', async () => {
    const result = await getAllFolderInfos(knexFnFake)
    expect(result).to.deep.equal({})
  })
  const folderRows = [
    { path: '/', folder: '', sortKey: '' },
    { path: '/foo', folder: '/', sortKey: 'foo' },
    { path: '/foo/bar', folder: '/foo/', sortKey: 'bar' },
    { path: '/baz', folder: '/', sortKey: 'baz' },
    { path: '/quux/is/beast', folder: '/quux/is/', sortKey: 'beast' },
  ]
  folderRows.forEach((row) => {
    it(`should include key for folder ${row.path}`, async () => {
      knexInstanceStub.select.resolves(folderRows)
      const results = await getAllFolderInfos(knexFnFake)
      expect(results).to.have.any.keys(row.path)
    })
    it(`should preserve folder column for ${row.path}`, async () => {
      knexInstanceStub.select.resolves(folderRows)
      const results = await getAllFolderInfos(knexFnFake)
      expect(results[row.path]?.folder).to.equal(row.folder)
    })
    it(`should preserve sortKey column for ${row.path}`, async () => {
      knexInstanceStub.select.resolves(folderRows)
      const results = await getAllFolderInfos(knexFnFake)
      expect(results[row.path]?.sortKey).to.equal(row.sortKey)
    })
    it(`should initialise totalCount to 0 for ${row.path}`, async () => {
      knexInstanceStub.select.resolves(folderRows)
      const results = await getAllFolderInfos(knexFnFake)
      expect(results[row.path]?.totalCount).to.equal(0)
    })
    it(`should initialise seenCount to 0 for ${row.path}`, async () => {
      knexInstanceStub.select.resolves(folderRows)
      const results = await getAllFolderInfos(knexFnFake)
      expect(results[row.path]?.seenCount).to.equal(0)
    })
  })
})
