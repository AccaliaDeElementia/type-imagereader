'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'

describe('routes/apiFunctions function GetChildFolders', () => {
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
  it('should select data from folders', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should select name from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.name).to.equal('baz')
  })
  it('should select non uri safe name from folders', async () => {
    const data = {
      path: '/foo/bar/<baz>',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.name).to.equal('<baz>')
  })
  it('should select path from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.path).to.equal('/foo/bar/baz')
  })
  it('should select uri safe path from folders', async () => {
    const data = {
      path: '/foo/bar/<baz>',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.path).to.equal('/foo/bar/%3Cbaz%3E')
  })
  it('should select cover as current from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
      current: '/foo/bar/baz.zip',
      firstPicture: '/foo/bar/quuz.bmp',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('current')
    expect(result[0]?.cover).to.equal('/foo/bar/baz.zip')
  })
  it('should select uri safe cover as current from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
      current: '/foo/bar/<baz>.zip',
      firstPicture: '/foo/bar/quuz.bmp',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('current')
    expect(result[0]?.cover).to.equal('/foo/bar/%3Cbaz%3E.zip')
  })
  it('should select firstPicture as current from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
      current: null,
      firstPicture: '/foo/bar/quuz.bmp',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('firstPicture')
    expect(result[0]?.cover).to.equal('/foo/bar/quuz.bmp')
  })
  it('should select uri safe firstPicture as current from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
      current: null,
      firstPicture: '/foo/bar/<quuz>.bmp',
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('firstPicture')
    expect(result[0]?.cover).to.equal('/foo/bar/%3Cquuz%3E.bmp')
  })
  it('should select totalCount from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
      totalCount: 42,
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('totalCount')
    expect(result[0]?.totalCount).to.equal(42)
  })
  it('should select totalSeen from folders', async () => {
    const data = {
      path: '/foo/bar/baz',
      seenCount: 69,
    }
    knexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.include('seenCount')
    expect(result[0]?.totalSeen).to.equal(69)
  })
  it('should filter query by folder', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.where.callCount).to.equal(1)
    expect(knexInstance.where.firstCall.args).to.have.lengthOf(3)
    expect(knexInstance.where.firstCall.args[0]).to.equal('folder')
    expect(knexInstance.where.firstCall.args[1]).to.equal('=')
    expect(knexInstance.where.firstCall.args[2]).to.equal('/foo/bar/')
  })
  it('should order by sortKey', async () => {
    await Functions.GetChildFolders(knexFake, '/foo/bar/')
    expect(knexInstance.orderBy.callCount).to.equal(1)
    expect(knexInstance.orderBy.firstCall.args).to.have.lengthOf(1)
    expect(knexInstance.orderBy.firstCall.args[0]).to.equal('sortKey')
  })
})
