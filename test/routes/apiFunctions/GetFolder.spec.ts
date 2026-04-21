'use sanity'

import { expect } from 'chai'
import { Functions } from '#routes/apiFunctions'
import { createKnexChainFake } from '#testutils/Knex'

describe('routes/apiFunctions function GetFolder', () => {
  let {
    instance: knexInstance,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['select', 'where'] as const, ['limit'] as const)
  beforeEach(() => {
    ;({
      instance: knexInstance,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['select', 'where'] as const, ['limit'] as const))
  })
  it('should select from folders table once', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should select from folders table with expected args', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should select expected columns once', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexInstance.select.callCount).to.equal(1)
  })
  it('should select exactly five columns', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexInstance.select.firstCall.args).to.have.lengthOf(5)
  })
  const columns = ['path', 'folder', 'sortKey', 'current', 'firstPicture'] as const
  columns.forEach((col) => {
    it(`should select ${col} column`, async () => {
      await Functions.GetFolder(knexFake, '/foo/bar')
      expect(knexInstance.select.firstCall.args).to.include(col)
    })
  })
  it('should limit to only one result once', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexInstance.limit.callCount).to.equal(1)
  })
  it('should limit to only one result with one argument', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexInstance.limit.firstCall.args).to.have.lengthOf(1)
  })
  it('should limit to only one result', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexInstance.limit.firstCall.args[0]).to.equal(1)
  })
  it('should return null when db returns no results', async () => {
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result).to.equal(null)
  })
  it('should return result from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/bar/',
        folder: '/foo/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result).to.be.an('object')
  })
  const namePathTests: Array<[string, string, 'name' | 'path', string]> = [
    ['name from db', '/foo/Rocketgirl Adventures/', 'name', 'Rocketgirl Adventures'],
    ['uri unsafe name from db', '/foo/<Rocketgirl Adventures>/', 'name', '<Rocketgirl Adventures>'],
    ['path from db', '/foo/The_Boss/', 'path', '/foo/The_Boss/'],
    ['uri safe path from db', '/foo/<The Boss>/', 'path', '/foo/%3CThe%20Boss%3E/'],
  ]
  namePathTests.forEach(([title, path, prop, expected]) => {
    it(`should set ${title}`, async () => {
      knexInstance.limit.resolves([
        {
          path,
          folder: '/foo/',
          sortKey: 'bar',
          current: '/foo/bar/image.png',
          firstPicture: '/foo/bar/otherImage.png',
        },
      ])
      const result = await Functions.GetFolder(knexFake, '/foo/bar')
      expect(result?.[prop]).to.equal(expected)
    })
  })
  const folderTests: Array<[string, string | null, string]> = [
    ['folder from db', '/foo/', '/foo/'],
    ['default folder when db returns the root sentinel', '', '/'],
    ['default folder when db returns null (legacy, pre-migration)', null, '/'],
    ['uri safe folder from db', '/<foo>/', '/%3Cfoo%3E/'],
  ]
  folderTests.forEach(([title, folder, expected]) => {
    it(`should set ${title}`, async () => {
      knexInstance.limit.resolves([
        {
          path: '/foo/The Boss/',
          folder,
          sortKey: 'bar',
          current: '/foo/bar/image.png',
          firstPicture: '/foo/bar/otherImage.png',
        },
      ])
      const result = await Functions.GetFolder(knexFake, '/foo/bar')
      expect(result?.folder).to.equal(expected)
    })
  })
  const coverTests: Array<[string, string | null, string | null, string | null]> = [
    ['cover from current image from db', '/foo/bar/image.png', '/foo/bar/otherImage.png', '/foo/bar/image.png'],
    [
      'uri safe cover from current image from db',
      '/foo/bar/the image.png',
      '/foo/bar/other image.png',
      '/foo/bar/the%20image.png',
    ],
    ['cover from first image when no current from db', null, '/foo/bar/otherImage.png', '/foo/bar/otherImage.png'],
    [
      'uri safe cover from first image when no current from db',
      null,
      '/foo/bar/other image.png',
      '/foo/bar/other%20image.png',
    ],
  ]
  coverTests.forEach(([title, current, firstPicture, expected]) => {
    it(`should set ${title}`, async () => {
      knexInstance.limit.resolves([{ path: '/foo/bar/', folder: '/foo/', sortKey: 'bar', current, firstPicture }])
      const result = await Functions.GetFolder(knexFake, '/foo/bar')
      expect(result?.cover).to.equal(expected)
    })
  })
})
