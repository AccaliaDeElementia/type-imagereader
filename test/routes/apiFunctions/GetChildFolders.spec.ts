'use sanity'

import { expect } from 'chai'
import { Functions } from '#routes/apiFunctions.js'
import { createKnexChainFake } from '#testutils/Knex.js'

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
  const columns = ['path', 'current', 'firstPicture', 'totalCount', 'seenCount'] as const
  columns.forEach((col) => {
    it(`should include ${col} column in select`, async () => {
      await Functions.GetChildFolders(knexFake, '/foo/bar/')
      expect(knexInstance.select.firstCall.args).to.include(col)
    })
  })
  const namePathTests: Array<[string, string, 'name' | 'path', string]> = [
    ['name', '/foo/bar/baz', 'name', 'baz'],
    ['non uri safe name', '/foo/bar/<baz>', 'name', '<baz>'],
    ['path', '/foo/bar/baz', 'path', '/foo/bar/baz'],
    ['uri safe path', '/foo/bar/<baz>', 'path', '/foo/bar/%3Cbaz%3E'],
  ]
  namePathTests.forEach(([title, path, prop, expected]) => {
    it(`should select ${title} from folders`, async () => {
      knexInstance.orderBy.resolves([{ path }])
      const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
      expect(result[0]?.[prop]).to.equal(expected)
    })
  })
  const coverTests: Array<[string, string | null, string, string]> = [
    ['cover as current', '/foo/bar/baz.zip', '/foo/bar/quuz.bmp', '/foo/bar/baz.zip'],
    ['uri safe cover as current', '/foo/bar/<baz>.zip', '/foo/bar/quuz.bmp', '/foo/bar/%3Cbaz%3E.zip'],
    ['firstPicture as cover when current is null', null, '/foo/bar/quuz.bmp', '/foo/bar/quuz.bmp'],
    ['uri safe firstPicture as cover when null', null, '/foo/bar/<quuz>.bmp', '/foo/bar/%3Cquuz%3E.bmp'],
    ['firstPicture as cover when current is empty-string sentinel', '', '/foo/bar/quuz.bmp', '/foo/bar/quuz.bmp'],
    [
      'uri safe firstPicture as cover when current is empty-string sentinel',
      '',
      '/foo/bar/<quuz>.bmp',
      '/foo/bar/%3Cquuz%3E.bmp',
    ],
  ]
  coverTests.forEach(([title, current, firstPicture, expected]) => {
    it(`should select ${title} from folders`, async () => {
      knexInstance.orderBy.resolves([{ path: '/foo/bar/baz', current, firstPicture }])
      const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
      expect(result[0]?.cover).to.equal(expected)
    })
  })
  it('should select totalCount from folders', async () => {
    knexInstance.orderBy.resolves([{ path: '/foo/bar/baz', totalCount: 42 }])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.totalCount).to.equal(42)
  })
  it('should select seenCount from folders', async () => {
    knexInstance.orderBy.resolves([{ path: '/foo/bar/baz', seenCount: 69 }])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.seenCount).to.equal(69)
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
