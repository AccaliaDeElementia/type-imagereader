'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'

describe('routes/apiFunctions function GetPictures', () => {
  let knexInstance = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    orderBy: Sinon.stub().resolves([]),
  }
  let knexStub = Sinon.stub().returns(knexInstance)
  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexInstance = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      orderBy: Sinon.stub().resolves([]),
    }
    knexStub = Sinon.stub().returns(knexInstance)
    knexFake = StubToKnex(knexStub)
  })
  it('should select data from pictures', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should select expected columns', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.have.lengthOf(2)
    expect(knexInstance.select.firstCall.args).to.include('path')
    expect(knexInstance.select.firstCall.args).to.include('seen')
  })
  it('should filter results to folder', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.where.callCount).to.equal(1)
    expect(knexInstance.where.firstCall.args).to.have.lengthOf(3)
    expect(knexInstance.where.firstCall.args[0]).to.equal('folder')
    expect(knexInstance.where.firstCall.args[1]).to.equal('=')
    expect(knexInstance.where.firstCall.args[2]).to.equal('/foo/bar/')
  })
  it('should order results by sort key then path', async () => {
    await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.callCount).to.equal(1)
    expect(knexInstance.orderBy.firstCall.args).to.have.lengthOf(2)
    expect(knexInstance.orderBy.firstCall.args[0]).to.equal('sortKey')
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
  it('should select seen from pictures', async () => {
    const data = [
      {
        path: '/foo/bar/baz.png',
        seen: true,
      },
      {
        path: '/foo/bar/baz.png',
        seen: false,
      },
    ]
    knexInstance.orderBy.resolves(data)
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    expect(result[0]?.seen).to.equal(true)
    expect(result[1]?.seen).to.equal(false)
  })
  it('should map index onto picture list', async () => {
    const data = Array(100).fill({
      path: '/foo/bar/baz.png',
      seen: true,
    })
    knexInstance.orderBy.resolves(data)
    const result = await Functions.GetPictures(knexFake, '/foo/bar/')
    for (let i = 0; i < result.length; i++) {
      expect(result[i]?.index).to.equal(i)
    }
  })
})
