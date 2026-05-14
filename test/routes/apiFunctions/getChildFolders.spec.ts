'use sanity'

import { getChildFolders } from '#routes/apiFunctions.js'
import { createKnexChainFake } from '#testutils/knex.js'

describe('routes/apiFunctions getChildFolders', () => {
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
    await getChildFolders(knexFake, '/foo/bar/')
    expect(knexStub.mock.calls.length).toBe(1)
  })
  it('should select data from folders', async () => {
    await getChildFolders(knexFake, '/foo/bar/')
    expect(knexStub.mock.calls[0]).toEqual(['folders'])
  })
  const columns = ['path', 'current', 'firstPicture', 'totalCount', 'seenCount'] as const
  columns.forEach((col) => {
    it(`should include ${col} column in select`, async () => {
      await getChildFolders(knexFake, '/foo/bar/')
      expect(knexInstance.select.mock.calls[0]).toContain(col)
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
      knexInstance.orderBy.mockResolvedValue([{ path }])
      const result = await getChildFolders(knexFake, '/foo/bar/')
      expect(result[0]?.[prop]).toBe(expected)
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
      knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/baz', current, firstPicture }])
      const result = await getChildFolders(knexFake, '/foo/bar/')
      expect(result[0]?.cover).toBe(expected)
    })
  })
  it('should select totalCount from folders', async () => {
    knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/baz', totalCount: 42 }])
    const result = await getChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.totalCount).toBe(42)
  })
  it('should select seenCount from folders', async () => {
    knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/baz', seenCount: 69 }])
    const result = await getChildFolders(knexFake, '/foo/bar/')
    expect(result[0]?.seenCount).toBe(69)
  })
  it('should call where once when filtering query by folder', async () => {
    await getChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.where.mock.calls.length).toBe(1)
  })
  it('should filter query by folder', async () => {
    await getChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.where.mock.calls[0]).toEqual(['folder', '=', '/foo/bar/'])
  })
  it('should call orderBy once', async () => {
    await getChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.mock.calls.length).toBe(1)
  })
  it('should order by sortKey', async () => {
    await getChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.mock.calls[0]?.[0]).toBe('sortKey')
  })
})
