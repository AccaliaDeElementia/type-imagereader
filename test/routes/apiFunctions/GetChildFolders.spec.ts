'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import { createKnexChainFake } from '../../../testutils/Knex'

describe('routes/apiFunctions function GetChildFolders', () => {
  let {
    instance: knexInstance,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['select', 'where'] as const, ['orderBy'] as const)
  beforeEach(() => {
    ;({
      instance: knexInstance,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['select', 'where'] as const, ['orderBy'] as const))
  })
  it('should call knex once when selecting data from folders', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should select data from folders', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should include path column in select', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.include('path')
  })
  it('should select name from folders', async () => {
    const data = { path: '/foo/bar/baz' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.name).to.equal('baz')
  })
  it('should select non uri safe name from folders', async () => {
    const data = { path: '/foo/bar/<baz>' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.name).to.equal('<baz>')
  })
  it('should select path from folders', async () => {
    const data = { path: '/foo/bar/baz' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.path).to.equal('/foo/bar/baz')
  })
  it('should select uri safe path from folders', async () => {
    const data = { path: '/foo/bar/<baz>' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.path).to.equal('/foo/bar/%3Cbaz%3E')
  })
  it('should include current column in select', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.include('current')
  })
  it('should select cover as current from folders', async () => {
    const data = { path: '/foo/bar/baz', current: '/foo/bar/baz.zip', firstPicture: '/foo/bar/quuz.bmp' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.cover).to.equal('/foo/bar/baz.zip')
  })
  it('should select uri safe cover as current from folders', async () => {
    const data = { path: '/foo/bar/baz', current: '/foo/bar/<baz>.zip', firstPicture: '/foo/bar/quuz.bmp' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.cover).to.equal('/foo/bar/%3Cbaz%3E.zip')
  })
  it('should include firstPicture column in select', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.include('firstPicture')
  })
  it('should select firstPicture as cover when current is null', async () => {
    const data = { path: '/foo/bar/baz', current: null, firstPicture: '/foo/bar/quuz.bmp' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.cover).to.equal('/foo/bar/quuz.bmp')
  })
  it('should select uri safe firstPicture as cover when current is null', async () => {
    const data = { path: '/foo/bar/baz', current: null, firstPicture: '/foo/bar/<quuz>.bmp' }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.cover).to.equal('/foo/bar/%3Cquuz%3E.bmp')
  })
  it('should include totalCount column in select', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.include('totalCount')
  })
  it('should select totalCount from folders', async () => {
    const data = { path: '/foo/bar/baz', totalCount: 42 }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.totalCount).to.equal(42)
  })
  it('should include seenCount column in select', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.include('seenCount')
  })
  it('should select totalSeen from folders', async () => {
    const data = { path: '/foo/bar/baz', seenCount: 69 }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.totalSeen).to.equal(69)
  })
  it('should call where once when filtering query by folder', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.where.callCount).to.equal(1)
  })
  it('should filter query by folder', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.where.firstCall.args).to.deep.equal(['folder', '=', '/foo/bar/'])
  })
  it('should call orderBy once', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.callCount).to.equal(1)
  })
  it('should order by sortKey', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.firstCall.args[0]).to.equal('sortKey')
  })
})
