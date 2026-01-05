'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'

describe('routes/apiFunctions function GetFolder', () => {
  let knexInstance = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    limit: Sinon.stub().resolves([]),
  }
  let knexStub = Sinon.stub().returns(knexInstance)
  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexInstance = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      limit: Sinon.stub().resolves([]),
    }
    knexStub = Sinon.stub().returns(knexInstance)
    knexFake = StubToKnex(knexStub)
  })
  it('should select from folders table', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should select expected columns', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.have.lengthOf(5)
    expect(knexInstance.select.firstCall.args).to.include('path')
    expect(knexInstance.select.firstCall.args).to.include('folder')
    expect(knexInstance.select.firstCall.args).to.include('sortKey')
    expect(knexInstance.select.firstCall.args).to.include('current')
    expect(knexInstance.select.firstCall.args).to.include('firstPicture')
  })
  it('should filter to only one result', async () => {
    await Functions.GetFolder(knexFake, '/foo/bar')
    expect(knexInstance.limit.callCount).to.equal(1)
    expect(knexInstance.limit.firstCall.args).to.have.lengthOf(1)
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
  it('should set name from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/Rocketgirl Adventures/',
        folder: '/foo/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.name).to.equal('Rocketgirl Adventures')
  })
  it('should set uri unsafe name from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/<Rocketgirl Adventures>/',
        folder: '/foo/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.name).to.equal('<Rocketgirl Adventures>')
  })
  it('should set path from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/The_Boss/',
        folder: '/foo/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.path).to.equal('/foo/The_Boss/')
  })
  it('should set uri safe path from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/<The Boss>/',
        folder: '/foo/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.path).to.equal('/foo/%3CThe%20Boss%3E/')
  })
  it('should set folder from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/The Boss/',
        folder: '/foo/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.folder).to.equal('/foo/')
  })
  it('should set default folder when db returns null', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/The Boss/',
        folder: null,
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.folder).to.equal('/')
  })
  it('should set uri safe folder from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/<The Boss>/',
        folder: '/<foo>/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.folder).to.equal('/%3Cfoo%3E/')
  })
  it('should set cover from current image from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/The Boss/',
        folder: '/foo/',
        sortKey: 'bar',
        current: '/foo/bar/image.png',
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/image.png')
  })
  it('should set uri safe cover from current image from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/<The Boss>/',
        folder: '/<foo>/',
        sortKey: 'bar',
        current: '/foo/bar/the image.png',
        firstPicture: '/foo/bar/other image.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/the%20image.png')
  })
  it('should set cover from first image when no current from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/The Boss/',
        folder: '/foo/',
        sortKey: 'bar',
        current: null,
        firstPicture: '/foo/bar/otherImage.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/otherImage.png')
  })
  it('should set uri safe cover from first image when no current from db', async () => {
    knexInstance.limit.resolves([
      {
        path: '/foo/<The Boss>/',
        folder: '/<foo>/',
        sortKey: 'bar',
        current: null,
        firstPicture: '/foo/bar/other image.png',
      },
    ])
    const result = await Functions.GetFolder(knexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/other%20image.png')
  })
})
