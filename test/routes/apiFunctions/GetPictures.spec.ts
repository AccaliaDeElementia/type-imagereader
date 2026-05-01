'use sanity'

import { expect } from 'chai'
import { Functions } from '#routes/apiFunctions'
import { createKnexChainFake } from '#testutils/Knex'

describe('routes/apiFunctions function GetPictures', () => {
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
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should select data from pictures', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should call select once', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
  })
  it('should select two columns', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.have.lengthOf(2)
  })
  it('should select path column', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.include('path')
  })
  it('should select seen column', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.firstCall.args).to.include('seen')
  })
  it('should call where once when filtering results', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.callCount).to.equal(1)
  })
  it('should filter with three arguments', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.firstCall.args).to.have.lengthOf(3)
  })
  it('should filter on folder column', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.firstCall.args[0]).to.equal('folder')
  })
  it('should filter with equality operator', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.firstCall.args[1]).to.equal('=')
  })
  it('should filter results to folder', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.firstCall.args[2]).to.equal('/foo/bar/')
  })
  it('should call orderBy once', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.callCount).to.equal(1)
  })
  it('should order by two columns', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.firstCall.args).to.have.lengthOf(2)
  })
  it('should order results by sort key', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.firstCall.args[0]).to.equal('sortKey')
  })
  it('should order results by sort key then path', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.firstCall.args[1]).to.equal('path')
  })
  it('should select name from pictures', async () => {
    const data = {
      path: '/foo/bar/baz.png',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.name).to.equal('baz')
  })
  it('should select non uri safe name from pictures', async () => {
    const data = {
      path: '/foo/bar/<baz>.png',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.name).to.equal('<baz>')
  })
  it('should select path from pictures', async () => {
    const data = {
      path: '/foo/bar/baz.png',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.path).to.equal('/foo/bar/baz.png')
  })
  it('should select uri safe path from pictures', async () => {
    const data = {
      path: '/foo/bar/<baz>.png',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.path).to.equal('/foo/bar/%3Cbaz%3E.png')
  })
  it('should preserve seen=true from pictures', async () => {
    const data = [
      { path: '/foo/bar/baz.png', seen: true },
      { path: '/foo/bar/baz.png', seen: false },
    ]
    knexInstance.orderBy.resolves(data)
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.seen).to.equal(true)
  })
  it('should preserve seen=false from pictures', async () => {
    const data = [
      { path: '/foo/bar/baz.png', seen: true },
      { path: '/foo/bar/baz.png', seen: false },
    ]
    knexInstance.orderBy.resolves(data)
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[1]?.seen).to.equal(false)
  })
  it('should coerce sqlite-style seen=1 to true', async () => {
    knexInstance.orderBy.resolves([{ path: '/foo/bar/baz.png', seen: 1 }])
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.seen).to.equal(true)
  })
  it('should coerce sqlite-style seen=0 to false', async () => {
    knexInstance.orderBy.resolves([{ path: '/foo/bar/baz.png', seen: 0 }])
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.seen).to.equal(false)
  })
  it('should produce a boolean-typed seen value for sqlite-style integer input', async () => {
    knexInstance.orderBy.resolves([{ path: '/foo/bar/baz.png', seen: 1 }])
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(typeof result[0]?.seen).to.equal('boolean')
  })
  it('should map index onto picture list', async () => {
    const data = Array(100).fill({
      path: '/foo/bar/baz.png',
      seen: true,
    })
    knexInstance.orderBy.resolves(data)
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    for (let i = 0; i < result.length; i += 1) {
      expect(result[i]?.index).to.equal(i)
    }
  })
})
