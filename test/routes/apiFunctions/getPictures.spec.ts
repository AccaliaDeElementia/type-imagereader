'use sanity'

import { getPictures } from '#routes/apiFunctions.js'
import { createKnexChainFake } from '#testutils/knex.js'

describe('routes/apiFunctions getPictures', () => {
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
  it('should call knex once when selecting from pictures', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexStub.mock.calls.length).toBe(1)
  })
  it('should select data from pictures', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexStub.mock.calls[0]).toEqual(['pictures'])
  })
  it('should call select once', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.mock.calls.length).toBe(1)
  })
  it('should select two columns', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.mock.calls[0]).toHaveLength(2)
  })
  it('should select path column', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.mock.calls[0]).toContain('path')
  })
  it('should select seen column', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.mock.calls[0]).toContain('seen')
  })
  it('should call where once when filtering results', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.mock.calls.length).toBe(1)
  })
  it('should filter with three arguments', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.mock.calls[0]).toHaveLength(3)
  })
  it('should filter on folder column', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.mock.calls[0]?.[0]).toBe('folder')
  })
  it('should filter with equality operator', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.mock.calls[0]?.[1]).toBe('=')
  })
  it('should filter results to folder', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.mock.calls[0]?.[2]).toBe('/foo/bar/')
  })
  it('should call orderBy once', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.mock.calls.length).toBe(1)
  })
  it('should order by two columns', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.mock.calls[0]).toHaveLength(2)
  })
  it('should order results by sort key', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.mock.calls[0]?.[0]).toBe('sortKey')
  })
  it('should order results by sort key then path', async () => {
    await getPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.mock.calls[0]?.[1]).toBe('path')
  })
  it('should select name from pictures', async () => {
    const data = {
      path: '/foo/bar/baz.png',
    }
    knexInstance.orderBy.mockResolvedValue([data])
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[0]?.name).toBe('baz')
  })
  it('should select non uri safe name from pictures', async () => {
    const data = {
      path: '/foo/bar/<baz>.png',
    }
    knexInstance.orderBy.mockResolvedValue([data])
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[0]?.name).toBe('<baz>')
  })
  it('should select path from pictures', async () => {
    const data = {
      path: '/foo/bar/baz.png',
    }
    knexInstance.orderBy.mockResolvedValue([data])
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[0]?.path).toBe('/foo/bar/baz.png')
  })
  it('should select uri safe path from pictures', async () => {
    const data = {
      path: '/foo/bar/<baz>.png',
    }
    knexInstance.orderBy.mockResolvedValue([data])
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[0]?.path).toBe('/foo/bar/%3Cbaz%3E.png')
  })
  it('should preserve seen=true from pictures', async () => {
    const data = [
      { path: '/foo/bar/baz.png', seen: true },
      { path: '/foo/bar/baz.png', seen: false },
    ]
    knexInstance.orderBy.mockResolvedValue(data)
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[0]?.seen).toBe(true)
  })
  it('should preserve seen=false from pictures', async () => {
    const data = [
      { path: '/foo/bar/baz.png', seen: true },
      { path: '/foo/bar/baz.png', seen: false },
    ]
    knexInstance.orderBy.mockResolvedValue(data)
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[1]?.seen).toBe(false)
  })
  it('should coerce sqlite-style seen=1 to true', async () => {
    knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/baz.png', seen: 1 }])
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[0]?.seen).toBe(true)
  })
  it('should coerce sqlite-style seen=0 to false', async () => {
    knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/baz.png', seen: 0 }])
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(result[0]?.seen).toBe(false)
  })
  it('should produce a boolean-typed seen value for sqlite-style integer input', async () => {
    knexInstance.orderBy.mockResolvedValue([{ path: '/foo/bar/baz.png', seen: 1 }])
    const result = await getPictures(knexFake, '/foo/bar/')
    expect(typeof result[0]?.seen).toBe('boolean')
  })
  it('should map index onto picture list', async () => {
    const data = Array(100).fill({
      path: '/foo/bar/baz.png',
      seen: true,
    })
    knexInstance.orderBy.mockResolvedValue(data)
    const result = await getPictures(knexFake, '/foo/bar/')
    for (let i = 0; i < result.length; i += 1) {
      expect(result[i]?.index).toBe(i)
    }
  })
})
