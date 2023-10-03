'use sanity'
import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Knex } from 'knex'

import { Functions, ModCount, UriSafePath } from '../../routes/apiFunctions'
import assert from 'assert'

@suite
export class ApiModCountTests {
  MathFloorSpy?: Sinon.SinonSpy
  MathRandomSpy?: Sinon.SinonSpy

  before () {
    this.MathFloorSpy = sinon.spy(Math, 'floor')
    this.MathRandomSpy = sinon.spy(Math, 'random')
    ApiModCountTests.ModCount.modCount = 5050
  }

  after () {
    this.MathFloorSpy?.restore()
    this.MathRandomSpy?.restore()
  }

  public static ModCount = class extends ModCount {
    public static get modCount (): number {
      return ModCount.modCount
    }

    public static set modCount (num: number) {
      ModCount.modCount = num
    }

    public static Reset (): number {
      return ModCount.Reset()
    }
  }

  @test
  'Reset() It should randomize start location' () {
    ApiModCountTests.ModCount.Reset()
    expect(this.MathRandomSpy?.callCount).to.equal(1)
    expect(this.MathRandomSpy?.firstCall.args).to.have.lengthOf(0)
  }

  @test
  'Reset() It should extend start location to (0, 1e10]' () {
    ApiModCountTests.ModCount.Reset()
    const value = 1e10 * this.MathRandomSpy?.firstCall.returnValue
    expect(this.MathFloorSpy?.callCount).to.equal(1)
    expect(this.MathFloorSpy?.firstCall.args).to.have.lengthOf(1)
    expect(this.MathFloorSpy?.firstCall.args[0]).to.equal(value)
  }

  @test
  'Reset() It should return integer value' () {
    const result = ApiModCountTests.ModCount.Reset()
    const value = this.MathFloorSpy?.firstCall.returnValue
    expect(result).to.equal(value)
    expect(ApiModCountTests.ModCount.modCount).to.equal(value)
  }

  @test
  'Get() It should return modcount value' () {
    ApiModCountTests.ModCount.modCount = 69420
    expect(ModCount.Get()).to.equal(69420)
  }

  @test
  'Valitate() It should return truth when modcount matches' () {
    ApiModCountTests.ModCount.modCount = 69420
    expect(ModCount.Validate(69420)).to.equal(true)
  }

  @test
  'Valitate() It should return false when modcount mismatches' () {
    ApiModCountTests.ModCount.modCount = 69420
    expect(ModCount.Validate(8675309)).to.equal(false)
  }

  @test
  'Increment() It should increment returned modcount by one' () {
    ApiModCountTests.ModCount.modCount = 69420
    expect(ModCount.Increment()).to.equal(69421)
  }

  @test
  'Increment() It should increment stored modcount by one' () {
    ApiModCountTests.ModCount.modCount = 69420
    ModCount.Increment()
    expect(ApiModCountTests.ModCount.modCount).to.equal(69421)
  }

  @test
  'Increment() It should reset modcount on rollover' () {
    ApiModCountTests.ModCount.modCount = Number.MAX_SAFE_INTEGER
    expect(ModCount.Increment()).to.equal(1)
  }
}

@suite
export class ApiUriSafePathTests {
  @test
  'decode() it should accept empty string' () {
    expect(UriSafePath.decode('')).to.equal('')
  }

  @test
  'decode() it should accept raw string' () {
    expect(UriSafePath.decode('/foo/bar')).to.equal('/foo/bar')
  }

  @test
  'decode() it should accept encoded string' () {
    expect(UriSafePath.decode('/%66%6F%6F/%62%61%72')).to.equal('/foo/bar')
  }

  @test
  'encodeNullable() it should accept null string' () {
    expect(UriSafePath.encodeNullable(null)).to.equal(null)
  }

  @test
  'encodeNullable() it should accept empty string' () {
    expect(UriSafePath.encodeNullable('')).to.equal(null)
  }

  @test
  'encodeNUllable() it should accept string with encoding' () {
    expect(UriSafePath.encodeNullable('/,foo=/<bar>')).to.equal('/%2Cfoo%3D/%3Cbar%3E')
  }

  @test
  'encode() it should accept empty string' () {
    expect(UriSafePath.encode('')).to.equal('')
  }

  @test
  'encode() it should accept string with encoding' () {
    expect(UriSafePath.encode('/,foo=/<bar>')).to.equal('/%2Cfoo%3D/%3Cbar%3E')
  }
}

@suite
export class ApiGetChildFoldersTests {
  KnexInstance = {
    select: sinon.stub().returnsThis(),
    where: sinon.stub().returnsThis(),
    orderBy: sinon.stub().resolves([])
  }

  KnexStub = sinon.stub().returns(this.KnexInstance)
  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should select data from folders' () {
    await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['folders'])
  }

  @test
  async 'it should select name from folders' () {
    const data = {
      path: '/foo/bar/baz'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.name).to.equal('baz')
  }

  @test
  async 'it should select non uri safe name from folders' () {
    const data = {
      path: '/foo/bar/<baz>'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.name).to.equal('<baz>')
  }

  @test
  async 'it should select path from folders' () {
    const data = {
      path: '/foo/bar/baz'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.path).to.equal('/foo/bar/baz')
  }

  @test
  async 'it should select uri safe path from folders' () {
    const data = {
      path: '/foo/bar/<baz>'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('path')
    expect(result[0]?.path).to.equal('/foo/bar/%3Cbaz%3E')
  }

  @test
  async 'it should select cover as current from folders' () {
    const data = {
      path: '/foo/bar/baz',
      current: '/foo/bar/baz.zip',
      firstPicture: '/foo/bar/quuz.bmp'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('current')
    expect(result[0]?.cover).to.equal('/foo/bar/baz.zip')
  }

  @test
  async 'it should select uri safe cover as current from folders' () {
    const data = {
      path: '/foo/bar/baz',
      current: '/foo/bar/<baz>.zip',
      firstPicture: '/foo/bar/quuz.bmp'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('current')
    expect(result[0]?.cover).to.equal('/foo/bar/%3Cbaz%3E.zip')
  }

  @test
  async 'it should select firstPicture as current from folders' () {
    const data = {
      path: '/foo/bar/baz',
      current: null,
      firstPicture: '/foo/bar/quuz.bmp'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('firstPicture')
    expect(result[0]?.cover).to.equal('/foo/bar/quuz.bmp')
  }

  @test
  async 'it should select uri safe firstPicture as current from folders' () {
    const data = {
      path: '/foo/bar/baz',
      current: null,
      firstPicture: '/foo/bar/<quuz>.bmp'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('firstPicture')
    expect(result[0]?.cover).to.equal('/foo/bar/%3Cquuz%3E.bmp')
  }

  @test
  async 'it should select totalCount from folders' () {
    const data = {
      path: '/foo/bar/baz',
      totalCount: 42
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('totalCount')
    expect(result[0]?.totalCount).to.equal(42)
  }

  @test
  async 'it should select totalSeen from folders' () {
    const data = {
      path: '/foo/bar/baz',
      seenCount: 69
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.include('seenCount')
    expect(result[0]?.totalSeen).to.equal(69)
  }

  @test
  async 'it should filter query by folder' () {
    await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.where.callCount).to.equal(1)
    expect(this.KnexInstance.where.firstCall.args).to.have.lengthOf(3)
    expect(this.KnexInstance.where.firstCall.args[0]).to.equal('folder')
    expect(this.KnexInstance.where.firstCall.args[1]).to.equal('=')
    expect(this.KnexInstance.where.firstCall.args[2]).to.equal('/foo/bar/')
  }

  @test
  async 'it should order by sortKey' () {
    await Functions.GetChildFolders(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.orderBy.callCount).to.equal(1)
    expect(this.KnexInstance.orderBy.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexInstance.orderBy.firstCall.args[0]).to.equal('sortKey')
  }
}

@suite
export class ApiGetChildPicturesTests {
  KnexInstance = {
    select: sinon.stub().returnsThis(),
    where: sinon.stub().returnsThis(),
    orderBy: sinon.stub().resolves([])
  }

  KnexStub = sinon.stub().returns(this.KnexInstance)
  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should select data from pictures' () {
    await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['pictures'])
  }

  @test
  async 'it should select expected columns' () {
    await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.have.lengthOf(2)
    expect(this.KnexInstance.select.firstCall.args).to.include('path')
    expect(this.KnexInstance.select.firstCall.args).to.include('seen')
  }

  @test
  async 'it should filter results to folder' () {
    await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.where.callCount).to.equal(1)
    expect(this.KnexInstance.where.firstCall.args).to.have.lengthOf(3)
    expect(this.KnexInstance.where.firstCall.args[0]).to.equal('folder')
    expect(this.KnexInstance.where.firstCall.args[1]).to.equal('=')
    expect(this.KnexInstance.where.firstCall.args[2]).to.equal('/foo/bar/')
  }

  @test
  async 'it should order results by sort key then path' () {
    await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(this.KnexInstance.orderBy.callCount).to.equal(1)
    expect(this.KnexInstance.orderBy.firstCall.args).to.have.lengthOf(2)
    expect(this.KnexInstance.orderBy.firstCall.args[0]).to.equal('sortKey')
    expect(this.KnexInstance.orderBy.firstCall.args[1]).to.equal('path')
  }

  @test
  async 'it should select name from pictures' () {
    const data = {
      path: '/foo/bar/baz.png'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(result[0]?.name).to.equal('baz.png')
  }

  @test
  async 'it should select non uri safe name from pictures' () {
    const data = {
      path: '/foo/bar/<baz>.png'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(result[0]?.name).to.equal('<baz>.png')
  }

  @test
  async 'it should select path from pictures' () {
    const data = {
      path: '/foo/bar/baz.png'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(result[0]?.path).to.equal('/foo/bar/baz.png')
  }

  @test
  async 'it should select uri safe path from pictures' () {
    const data = {
      path: '/foo/bar/<baz>.png'
    }
    this.KnexInstance.orderBy.resolves([data])
    const result = await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(result[0]?.path).to.equal('/foo/bar/%3Cbaz%3E.png')
  }

  @test
  async 'it should select seen from pictures' () {
    const data = [{
      path: '/foo/bar/baz.png',
      seen: true
    }, {
      path: '/foo/bar/baz.png',
      seen: false
    }]
    this.KnexInstance.orderBy.resolves(data)
    const result = await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    expect(result[0]?.seen).to.equal(true)
    expect(result[1]?.seen).to.equal(false)
  }

  @test
  async 'it should map index onto picture list' () {
    const data = Array(100).fill({
      path: '/foo/bar/baz.png',
      seen: true
    })
    this.KnexInstance.orderBy.resolves(data)
    const result = await Functions.GetPictures(this.KnexFake, '/foo/bar/')
    for (let i = 0; i < result.length; i++) {
      expect(result[i]?.index).to.equal(i)
    }
  }
}

@suite
export class ApiGetDirectionFolderTests {
  KnexFirstCall = {
    select: sinon.stub().returnsThis(),
    where: sinon.stub().returnsThis(),
    andWhere: sinon.stub().returnsThis(),
    orderBy: sinon.stub().returnsThis(),
    limit: sinon.stub().returns(1)
  }

  KnexSecondCall = {
    select: sinon.stub().returnsThis(),
    where: sinon.stub().returnsThis(),
    andWhere: sinon.stub().returnsThis(),
    orderBy: sinon.stub().returnsThis(),
    limit: sinon.stub().returns(2)
  }

  KnexStub = sinon.stub()
    .onFirstCall().returns(this.KnexFirstCall)
    .onSecondCall().returns(this.KnexSecondCall)

  KnexFake = this.KnexStub as unknown as Knex

  UnionStub = sinon.stub().resolves([])

  before () {
    this.KnexFake.union = this.UnionStub
  }

  @test
  async 'it should select from folders twice for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo', 'asc')
    expect(this.KnexStub.callCount).to.equal(2)
    expect(this.KnexStub.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.firstCall.args[0]).to.equal('folders')
    expect(this.KnexStub.secondCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.secondCall.args[0]).to.equal('folders')
  }

  @test
  async 'it should select from folders twice for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo', 'desc')
    expect(this.KnexStub.callCount).to.equal(2)
    expect(this.KnexStub.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.firstCall.args[0]).to.equal('folders')
    expect(this.KnexStub.secondCall.args).to.have.lengthOf(1)
    expect(this.KnexStub.secondCall.args[0]).to.equal('folders')
  }

  @test
  async 'it should select same colums both times for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo', 'asc')
    expect(this.KnexFirstCall.select.callCount).to.equal(1)
    expect(this.KnexFirstCall.select.firstCall.args).to.have.lengthOf(3)
    expect(this.KnexFirstCall.select.firstCall.args).to.include('path')
    expect(this.KnexFirstCall.select.firstCall.args).to.include('current')
    expect(this.KnexFirstCall.select.firstCall.args).to.include('firstPicture')
    expect(this.KnexSecondCall.select.callCount).to.equal(1)
    expect(this.KnexSecondCall.select.firstCall.args).to.have.lengthOf(3)
    expect(this.KnexSecondCall.select.firstCall.args).to.include('path')
    expect(this.KnexSecondCall.select.firstCall.args).to.include('current')
    expect(this.KnexSecondCall.select.firstCall.args).to.include('firstPicture')
  }

  @test
  async 'it should select same colums both times for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo', 'desc')
    expect(this.KnexFirstCall.select.callCount).to.equal(1)
    expect(this.KnexFirstCall.select.firstCall.args).to.have.lengthOf(3)
    expect(this.KnexFirstCall.select.firstCall.args).to.include('path')
    expect(this.KnexFirstCall.select.firstCall.args).to.include('current')
    expect(this.KnexFirstCall.select.firstCall.args).to.include('firstPicture')
    expect(this.KnexSecondCall.select.callCount).to.equal(1)
    expect(this.KnexSecondCall.select.firstCall.args).to.have.lengthOf(3)
    expect(this.KnexSecondCall.select.firstCall.args).to.include('path')
    expect(this.KnexSecondCall.select.firstCall.args).to.include('current')
    expect(this.KnexSecondCall.select.firstCall.args).to.include('firstPicture')
  }

  @test
  async 'it should filter for same sort key for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    expect(this.KnexFirstCall.where.callCount).to.equal(1)
    expect(this.KnexFirstCall.andWhere.callCount).to.equal(2)
    const queries = [
      this.KnexFirstCall.where.firstCall.args,
      this.KnexFirstCall.andWhere.firstCall.args,
      this.KnexFirstCall.andWhere.secondCall.args
    ]
    const folderFilter = queries.filter(arg => arg[0] === 'folder')[0]
    assert(folderFilter)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.filter(arg => arg[0] === 'sortKey')[0]
    assert(sortKeyFilter)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('=')
    expect(sortKeyFilter[2]).to.equal('foo69420')
    const pathFilter = queries.filter(arg => arg[0] === 'path')[0]
    assert(pathFilter)
    expect(pathFilter).to.have.lengthOf(3)
    expect(pathFilter[0]).to.equal('path')
    expect(pathFilter[1]).to.equal('>')
    expect(pathFilter[2]).to.equal('/foo/bar')
  }

  @test
  async 'it should filter for same sort key for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'desc')
    expect(this.KnexFirstCall.where.callCount).to.equal(1)
    expect(this.KnexFirstCall.andWhere.callCount).to.equal(2)
    const queries = [
      this.KnexFirstCall.where.firstCall.args,
      this.KnexFirstCall.andWhere.firstCall.args,
      this.KnexFirstCall.andWhere.secondCall.args
    ]
    const folderFilter = queries.filter(arg => arg[0] === 'folder')[0]
    assert(folderFilter)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.filter(arg => arg[0] === 'sortKey')[0]
    assert(sortKeyFilter)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('=')
    expect(sortKeyFilter[2]).to.equal('foo69420')
    const pathFilter = queries.filter(arg => arg[0] === 'path')[0]
    assert(pathFilter)
    expect(pathFilter).to.have.lengthOf(3)
    expect(pathFilter[0]).to.equal('path')
    expect(pathFilter[1]).to.equal('<')
    expect(pathFilter[2]).to.equal('/foo/bar')
  }

  @test
  async 'it should filter for different sort key for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    expect(this.KnexSecondCall.where.callCount).to.equal(1)
    expect(this.KnexSecondCall.andWhere.callCount).to.equal(1)
    const queries = [
      this.KnexSecondCall.where.firstCall.args,
      this.KnexSecondCall.andWhere.firstCall.args
    ]
    const folderFilter = queries.filter(arg => arg[0] === 'folder')[0]
    assert(folderFilter)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.filter(arg => arg[0] === 'sortKey')[0]
    assert(sortKeyFilter)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('>')
    expect(sortKeyFilter[2]).to.equal('foo69420')
  }

  @test
  async 'it should filter for different sort key for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'desc')
    expect(this.KnexSecondCall.where.callCount).to.equal(1)
    expect(this.KnexSecondCall.andWhere.callCount).to.equal(1)
    const queries = [
      this.KnexSecondCall.where.firstCall.args,
      this.KnexSecondCall.andWhere.firstCall.args
    ]
    const folderFilter = queries.filter(arg => arg[0] === 'folder')[0]
    assert(folderFilter)
    expect(folderFilter).to.have.lengthOf(3)
    expect(folderFilter[0]).to.equal('folder')
    expect(folderFilter[1]).to.equal('=')
    expect(folderFilter[2]).to.equal('/foo/')
    const sortKeyFilter = queries.filter(arg => arg[0] === 'sortKey')[0]
    assert(sortKeyFilter)
    expect(sortKeyFilter).to.have.lengthOf(3)
    expect(sortKeyFilter[0]).to.equal('sortKey')
    expect(sortKeyFilter[1]).to.equal('<')
    expect(sortKeyFilter[2]).to.equal('foo69420')
  }

  @test
  async 'it should order properly for same sort key for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    expect(this.KnexFirstCall.orderBy.callCount).to.equal(1)
    expect(this.KnexFirstCall.orderBy.firstCall.args).to.deep.equal(['path', 'asc'])
  }

  @test
  async 'it should order properly for same sort key for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'desc')
    expect(this.KnexFirstCall.orderBy.callCount).to.equal(1)
    expect(this.KnexFirstCall.orderBy.firstCall.args).to.deep.equal(['path', 'desc'])
  }

  @test
  async 'it should order properly for different sort key for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    expect(this.KnexSecondCall.orderBy.callCount).to.equal(1)
    expect(this.KnexSecondCall.orderBy.firstCall.args).to.deep.equal(['sortKey', 'asc'])
  }

  @test
  async 'it should order properly for different sort key for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'desc')
    expect(this.KnexSecondCall.orderBy.callCount).to.equal(1)
    expect(this.KnexSecondCall.orderBy.firstCall.args).to.deep.equal(['sortKey', 'desc'])
  }

  @test
  async 'it should limit same sort key query for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    expect(this.KnexFirstCall.limit.callCount).to.equal(1)
    expect(this.KnexFirstCall.limit.firstCall.args).to.deep.equal([1])
  }

  @test
  async 'it should limit same sort key query for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'desc')
    expect(this.KnexFirstCall.limit.callCount).to.equal(1)
    expect(this.KnexFirstCall.limit.firstCall.args).to.deep.equal([1])
  }

  @test
  async 'it should limit different sort key query for asc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    expect(this.KnexSecondCall.limit.callCount).to.equal(1)
    expect(this.KnexSecondCall.limit.firstCall.args).to.deep.equal([1])
  }

  @test
  async 'it should limit different sort key query for desc' () {
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'desc')
    expect(this.KnexSecondCall.limit.callCount).to.equal(1)
    expect(this.KnexSecondCall.limit.firstCall.args).to.deep.equal([1])
  }

  @test
  async 'it should union same sortkey and different sort key queries for asc' () {
    this.KnexFirstCall.limit.returns(100)
    this.KnexSecondCall.limit.returns(200)
    await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'desc')
    expect(this.UnionStub.callCount).to.equal(1)
    expect(this.UnionStub.firstCall.args).to.have.lengthOf(2)
    expect(this.UnionStub.firstCall.args[0]).to.deep.equal([100, 200])
    expect(this.UnionStub.firstCall.args[1]).to.equal(true)
  }

  @test
  async 'it should resolve null when query finds no results' () {
    this.UnionStub.resolves([])
    const result = await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    expect(result).to.equal(null)
  }

  @test
  async 'it should resolve parsed result when query finds results' () {
    this.UnionStub.resolves([{
      path: '/foo/abcde0',
      current: '/foo/abcde0/image.png',
      firstPicture: '/foo/abcde0/otherImage.png'
    }])
    const result = await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    assert(result)
    expect(Object.keys(result)).to.have.lengthOf(3)
    expect(result.name).to.equal('abcde0')
    expect(result.path).to.equal('/foo/abcde0')
    expect(result.cover).to.equal('/foo/abcde0/image.png')
  }

  @test
  async 'it should resolve uri safe results when query finds results' () {
    this.UnionStub.resolves([{
      path: '/foo/abcde<0>',
      current: '/foo/abcde<0>/image.png',
      firstPicture: '/foo/abcde<0>/otherImage.png'
    }])
    const result = await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    assert(result)
    expect(Object.keys(result)).to.have.lengthOf(3)
    expect(result.name).to.equal('abcde<0>')
    expect(result.path).to.equal('/foo/abcde%3C0%3E')
    expect(result.cover).to.equal('/foo/abcde%3C0%3E/image.png')
  }

  @test
  async 'it should resolve with current image as cover when set' () {
    this.UnionStub.resolves([{
      path: '/foo/abcde0',
      current: '/foo/abcde0/image.png',
      firstPicture: '/foo/abcde0/otherImage.png'
    }])
    const result = await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    assert(result)
    expect(result.cover).to.equal('/foo/abcde0/image.png')
  }

  @test
  async 'it should resolve with firstPicture as cover when current image not set' () {
    this.UnionStub.resolves([{
      path: '/foo/abcde0',
      current: null,
      firstPicture: '/foo/abcde0/otherImage.png'
    }])
    const result = await Functions.GetDirectionFolder(this.KnexFake, '/foo/bar', 'foo69420', 'asc')
    assert(result)
    expect(result.cover).to.equal('/foo/abcde0/otherImage.png')
  }
}

@suite
export class ApiGetNextFolderTests {
  KnexFake = { Knex: Math.random() } as unknown as Knex
  GetDirectionFolderStub?: Sinon.SinonStub

  before () {
    this.GetDirectionFolderStub = sinon.stub(Functions, 'GetDirectionFolder').resolves()
  }

  after () {
    this.GetDirectionFolderStub?.restore()
  }

  @test
  async 'it should call GetDirectionFolder to do actual query' () {
    await Functions.GetNextFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.callCount).to.equal(1)
  }

  @test
  async 'it should call pass knex parameter to do actual query' () {
    await Functions.GetNextFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.firstCall.args[0]).to.equal(this.KnexFake)
  }

  @test
  async 'it should call pass path parameter to do actual query' () {
    await Functions.GetNextFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.firstCall.args[1]).to.equal('/foo')
  }

  @test
  async 'it should call pass sortkey parameter to do actual query' () {
    await Functions.GetNextFolder(this.KnexFake, '/foo', 'foo90210')
    expect(this.GetDirectionFolderStub?.firstCall.args[2]).to.equal('foo90210')
  }

  @test
  async 'it should call pass asc as direction parameter to do actual query' () {
    await Functions.GetNextFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.firstCall.args[3]).to.equal('asc')
  }

  @test
  async 'it should resolve as result of actual query' () {
    const data = { data: Math.random() }
    this.GetDirectionFolderStub?.resolves(data)
    const result = await Functions.GetNextFolder(this.KnexFake, '/foo', 'foo')
    expect(result).to.equal(data)
  }
}

@suite
export class ApiGetPreviousFolderTests {
  KnexFake = { Knex: Math.random() } as unknown as Knex
  GetDirectionFolderStub?: Sinon.SinonStub

  before () {
    this.GetDirectionFolderStub = sinon.stub(Functions, 'GetDirectionFolder').resolves()
  }

  after () {
    this.GetDirectionFolderStub?.restore()
  }

  @test
  async 'it should call GetDirectionFolder to do actual query' () {
    await Functions.GetPreviousFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.callCount).to.equal(1)
  }

  @test
  async 'it should call pass knex parameter to do actual query' () {
    await Functions.GetPreviousFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.firstCall.args[0]).to.equal(this.KnexFake)
  }

  @test
  async 'it should call pass path parameter to do actual query' () {
    await Functions.GetPreviousFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.firstCall.args[1]).to.equal('/foo')
  }

  @test
  async 'it should call pass sortkey parameter to do actual query' () {
    await Functions.GetPreviousFolder(this.KnexFake, '/foo', 'foo90210')
    expect(this.GetDirectionFolderStub?.firstCall.args[2]).to.equal('foo90210')
  }

  @test
  async 'it should call pass desc as direction parameter to do actual query' () {
    await Functions.GetPreviousFolder(this.KnexFake, '/foo', 'foo')
    expect(this.GetDirectionFolderStub?.firstCall.args[3]).to.equal('desc')
  }

  @test
  async 'it should resolve as result of actual query' () {
    const data = { data: Math.random() }
    this.GetDirectionFolderStub?.resolves(data)
    const result = await Functions.GetNextFolder(this.KnexFake, '/foo', 'foo')
    expect(result).to.equal(data)
  }
}

@suite
export class ApiGetFolderTests {
  KnexInstance = {
    select: sinon.stub().returnsThis(),
    where: sinon.stub().returnsThis(),
    limit: sinon.stub().resolves([])
  }

  KnexStub = sinon.stub().returns(this.KnexInstance)
  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should select from folders table' () {
    await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['folders'])
  }

  @test
  async 'it should select expected columns' () {
    await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.have.lengthOf(5)
    expect(this.KnexInstance.select.firstCall.args).to.include('path')
    expect(this.KnexInstance.select.firstCall.args).to.include('folder')
    expect(this.KnexInstance.select.firstCall.args).to.include('sortKey')
    expect(this.KnexInstance.select.firstCall.args).to.include('current')
    expect(this.KnexInstance.select.firstCall.args).to.include('firstPicture')
  }

  @test
  async 'it should filter to only one result' () {
    await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(this.KnexInstance.limit.callCount).to.equal(1)
    expect(this.KnexInstance.limit.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexInstance.limit.firstCall.args[0]).to.equal(1)
  }

  @test
  async 'it should return null when db returns no results' () {
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result).to.equal(null)
  }

  @test
  async 'it should return result from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/bar/',
      folder: '/foo/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result).to.be.an('object')
  }

  @test
  async 'it should set name from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/Rocketgirl Adventures/',
      folder: '/foo/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.name).to.equal('Rocketgirl Adventures')
  }

  @test
  async 'it should set uri unsafe name from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/<Rocketgirl Adventures>/',
      folder: '/foo/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.name).to.equal('<Rocketgirl Adventures>')
  }

  @test
  async 'it should set path from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/The_Boss/',
      folder: '/foo/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.path).to.equal('/foo/The_Boss/')
  }

  @test
  async 'it should set uri safe path from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/<The Boss>/',
      folder: '/foo/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.path).to.equal('/foo/%3CThe%20Boss%3E/')
  }

  @test
  async 'it should set folder from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/The Boss/',
      folder: '/foo/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.folder).to.equal('/foo/')
  }

  @test
  async 'it should set uri safe folder from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/<The Boss>/',
      folder: '/<foo>/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.folder).to.equal('/%3Cfoo%3E/')
  }

  @test
  async 'it should set cover from current image from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/The Boss/',
      folder: '/foo/',
      sortKey: 'bar',
      current: '/foo/bar/image.png',
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/image.png')
  }

  @test
  async 'it should set uri safe cover from current image from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/<The Boss>/',
      folder: '/<foo>/',
      sortKey: 'bar',
      current: '/foo/bar/the image.png',
      firstPicture: '/foo/bar/other image.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/the%20image.png')
  }

  @test
  async 'it should set cover from first image when no current from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/The Boss/',
      folder: '/foo/',
      sortKey: 'bar',
      current: null,
      firstPicture: '/foo/bar/otherImage.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/otherImage.png')
  }

  @test
  async 'it should set uri safe cover from first image when no current from db' () {
    this.KnexInstance.limit.resolves([{
      path: '/foo/<The Boss>/',
      folder: '/<foo>/',
      sortKey: 'bar',
      current: null,
      firstPicture: '/foo/bar/other image.png'
    }])
    const result = await Functions.GetFolder(this.KnexFake, '/foo/bar')
    expect(result?.cover).to.equal('/foo/bar/other%20image.png')
  }
}

@suite
export class ApiGetBookmarksTests {
  KnexInstance = {
    select: sinon.stub().returnsThis(),
    join: sinon.stub().returnsThis(),
    orderBy: sinon.stub().resolves([])
  }

  KnexStub = sinon.stub().returns(this.KnexInstance)
  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should select results from bookmarks' () {
    await Functions.GetBookmarks(this.KnexFake)
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['bookmarks'])
  }

  @test
  async 'it should select expected fields from bookmarks' () {
    await Functions.GetBookmarks(this.KnexFake)
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.have.lengthOf(2)
    expect(this.KnexInstance.select.firstCall.args).to.include('pictures.path')
    expect(this.KnexInstance.select.firstCall.args).to.include('pictures.folder')
  }

  @test
  async 'it should join pictures to bookmarks' () {
    await Functions.GetBookmarks(this.KnexFake)
    expect(this.KnexInstance.join.callCount).to.be.greaterThanOrEqual(1)
    const call = this.KnexInstance.join.getCalls().filter(call => call.args[0] === 'pictures')[0]
    assert(call)
    expect(call.args).to.deep.equal(['pictures', 'pictures.path', 'bookmarks.path'])
  }

  @test
  async 'it should join folders to bookmarks' () {
    await Functions.GetBookmarks(this.KnexFake)
    expect(this.KnexInstance.join.callCount).to.be.greaterThanOrEqual(1)
    const call = this.KnexInstance.join.getCalls().filter(call => call.args[0] === 'folders')[0]
    assert(call)
    expect(call.args).to.deep.equal(['folders', 'folders.path', 'pictures.folder'])
  }

  @test
  async 'it should order strictly by folder then picture including sortkey and paths' () {
    await Functions.GetBookmarks(this.KnexFake)
    expect(this.KnexInstance.orderBy.callCount).to.equal(1)
    expect(this.KnexInstance.orderBy.firstCall.args).to.have.lengthOf(1)
    expect(this.KnexInstance.orderBy.firstCall.args[0]).to.deep.equal([
      'folders.path',
      'folders.sortKey',
      'pictures.sortKey',
      'pictures.path'
    ])
  }

  @test
  async 'it should resolve to empty with no bookmarks' () {
    this.KnexInstance.orderBy.resolves([])
    const bookmarks = await Functions.GetBookmarks(this.KnexFake)
    expect(bookmarks).to.deep.equal([])
  }

  @test
  async 'it should resolve to results with bookmarks' () {
    this.KnexInstance.orderBy.resolves([
      { path: '/foo/a bar/a quux.png', folder: '/foo/a bar/' },
      { path: '/foo/a bar/a quuux.png', folder: '/foo/a bar/' },
      { path: '/foo/a baz/a quux.png', folder: '/foo/a baz/' }
    ])
    const expected = [
      {
        name: '/foo/a bar/',
        path: '/foo/a%20bar/',
        bookmarks: [
          {
            name: 'a quux.png',
            path: '/foo/a%20bar/a%20quux.png',
            folder: '/foo/a%20bar/'
          }, {
            name: 'a quuux.png',
            path: '/foo/a%20bar/a%20quuux.png',
            folder: '/foo/a%20bar/'
          }
        ]
      }, {
        name: '/foo/a baz/',
        path: '/foo/a%20baz/',
        bookmarks: [
          {
            name: 'a quux.png',
            path: '/foo/a%20baz/a%20quux.png',
            folder: '/foo/a%20baz/'
          }
        ]
      }
    ]
    const bookmarks = await Functions.GetBookmarks(this.KnexFake)
    expect(bookmarks).to.deep.equal(expected)
  }
}

@suite
export class ApiGetListingTests {
  GetFolderStub?: Sinon.SinonStub
  GetNextFolderStub?: Sinon.SinonStub
  GetPreviousFolderStub?: Sinon.SinonStub
  GetChildFoldersStub?: Sinon.SinonStub
  GetPicturesStub?: Sinon.SinonStub
  GetBookmarksStub?: Sinon.SinonStub

  KnexFake = { Knex: Math.random() } as unknown as Knex

  before () {
    ApiModCountTests.ModCount.modCount = 32_768
    this.GetFolderStub = sinon.stub(Functions, 'GetFolder').resolves()
    this.GetNextFolderStub = sinon.stub(Functions, 'GetNextFolder').resolves()
    this.GetPreviousFolderStub = sinon.stub(Functions, 'GetPreviousFolder').resolves()
    this.GetChildFoldersStub = sinon.stub(Functions, 'GetChildFolders').resolves()
    this.GetPicturesStub = sinon.stub(Functions, 'GetPictures').resolves()
    this.GetBookmarksStub = sinon.stub(Functions, 'GetBookmarks').resolves()
  }

  after () {
    this.GetFolderStub?.restore()
    this.GetNextFolderStub?.restore()
    this.GetPreviousFolderStub?.restore()
    this.GetChildFoldersStub?.restore()
    this.GetPicturesStub?.restore()
    this.GetBookmarksStub?.restore()
  }

  @test
  async 'it should call GetFolder()' () {
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetFolderStub?.callCount).to.equal(1)
    expect(this.GetFolderStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.GetFolderStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetFolderStub?.firstCall.args[1]).to.equal('/foo/bar/')
  }

  @test
  async 'it should return null when GetFolder() does nto resolve to a folder' () {
    this.GetFolderStub?.resolves(null)
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(result).to.equal(null)
  }

  @test
  async 'it should abort early when GetFolder() does not resolve to a folder' () {
    this.GetFolderStub?.resolves(null)
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetNextFolderStub?.callCount).to.equal(0)
    expect(this.GetPreviousFolderStub?.callCount).to.equal(0)
    expect(this.GetChildFoldersStub?.callCount).to.equal(0)
    expect(this.GetPicturesStub?.callCount).to.equal(0)
    expect(this.GetBookmarksStub?.callCount).to.equal(0)
  }

  @test
  async 'it should continue when GetFolder() resolves to a folder' () {
    this.GetFolderStub?.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<'
    })
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetNextFolderStub?.callCount).to.equal(1)
    expect(this.GetPreviousFolderStub?.callCount).to.equal(1)
    expect(this.GetChildFoldersStub?.callCount).to.equal(1)
    expect(this.GetPicturesStub?.callCount).to.equal(1)
    expect(this.GetBookmarksStub?.callCount).to.equal(1)
  }

  @test
  async 'it should call GetNextFolder()' () {
    this.GetFolderStub?.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<'
    })
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetNextFolderStub?.callCount).to.equal(1)
    expect(this.GetNextFolderStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.GetNextFolderStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetNextFolderStub?.firstCall.args[1]).to.equal('/foo/bar/')
    expect(this.GetNextFolderStub?.firstCall.args[2]).to.equal('bar>-<')
  }

  @test
  async 'it should call GetPreviousFolder()' () {
    this.GetFolderStub?.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<'
    })
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetPreviousFolderStub?.callCount).to.equal(1)
    expect(this.GetPreviousFolderStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.GetPreviousFolderStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetPreviousFolderStub?.firstCall.args[1]).to.equal('/foo/bar/')
    expect(this.GetPreviousFolderStub?.firstCall.args[2]).to.equal('bar>-<')
  }

  @test
  async 'it should call GetChildFolders()' () {
    this.GetFolderStub?.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<'
    })
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetChildFoldersStub?.callCount).to.equal(1)
    expect(this.GetChildFoldersStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.GetChildFoldersStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetChildFoldersStub?.firstCall.args[1]).to.equal('/foo/bar/')
  }

  @test
  async 'it should call GetPictures()' () {
    this.GetFolderStub?.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<'
    })
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetPicturesStub?.callCount).to.equal(1)
    expect(this.GetPicturesStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.GetPicturesStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetPicturesStub?.firstCall.args[1]).to.equal('/foo/bar/')
  }

  @test
  async 'it should call GetBookmarks()' () {
    this.GetFolderStub?.resolves({
      name: 'bar<=>',
      path: '/foo/bar/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<'
    })
    await Functions.GetListing(this.KnexFake, '/foo/bar/')
    expect(this.GetBookmarksStub?.callCount).to.equal(1)
    expect(this.GetBookmarksStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.GetBookmarksStub?.firstCall.args[0]).to.equal(this.KnexFake)
  }

  @test
  async 'it should resolve folder data' () {
    this.GetFolderStub?.resolves({
      name: 'bar<=>',
      path: '/fop/bat/',
      folder: '/foo/',
      cover: '/foo/bar/image.png',
      sortKey: 'bar>-<'
    })
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    assert(result)
    expect(result.name).to.equal('bar<=>')
    expect(result.path).to.equal('/fop/bat/')
    expect(result.parent).to.equal('/foo/')
    expect(result.cover).to.equal('/foo/bar/image.png')
  }

  @test
  async 'it should set next from GetNextFolder()' () {
    const data = { data: Math.random() }
    this.GetFolderStub?.resolves({})
    this.GetNextFolderStub?.resolves(data)
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    assert(result)
    expect(result.next).to.equal(data)
  }

  @test
  async 'it should set prev from GetPreviousFolder()' () {
    const data = { data: Math.random() }
    this.GetFolderStub?.resolves({})
    this.GetPreviousFolderStub?.resolves(data)
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    assert(result)
    expect(result.prev).to.equal(data)
  }

  @test
  async 'it should set children from GetChildFolders()' () {
    const data = { data: Math.random() }
    this.GetFolderStub?.resolves({})
    this.GetChildFoldersStub?.resolves(data)
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    assert(result)
    expect(result.children).to.equal(data)
  }

  @test
  async 'it should set next from GetPictures()' () {
    const data = { data: Math.random() }
    this.GetFolderStub?.resolves({})
    this.GetPicturesStub?.resolves(data)
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    assert(result)
    expect(result.pictures).to.equal(data)
  }

  @test
  async 'it should set bookmarks from GetBookmarks()' () {
    const data = { data: Math.random() }
    this.GetFolderStub?.resolves({})
    this.GetBookmarksStub?.resolves(data)
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    assert(result)
    expect(result.bookmarks).to.equal(data)
  }

  @test
  async 'it should set modcount' () {
    this.GetFolderStub?.resolves({})
    ApiModCountTests.ModCount.modCount = 9090
    const result = await Functions.GetListing(this.KnexFake, '/foo/bar/')
    assert(result)
    expect(result.modCount).to.equal(9090)
  }
}

@suite
export class ApiGetPictureFoldersTests {
  @test
  'it should resolve to expected paths for root image' () {
    expect(Functions.GetPictureFolders('/image.png')).to.deep.equal(['/'])
  }

  @test
  'it should resolve to expected paths for deep image' () {
    const input = '/foo/bar/baz/quux/xyzzy/image.png'
    const expected = [
      '/foo/bar/baz/quux/xyzzy/',
      '/foo/bar/baz/quux/',
      '/foo/bar/baz/',
      '/foo/bar/',
      '/foo/',
      '/'
    ]
    expect(Functions.GetPictureFolders(input)).to.deep.equal(expected)
  }
}

@suite
export class ApiSetLatestPictureTests {
  static KnexQueryResult: any = null

  static GetKnexInstance (): Knex {
    return {
      select: sinon.stub().returnsThis(),
      increment: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      whereIn: sinon.stub().resolves([]),
      where: sinon.stub().resolves([ApiSetLatestPictureTests.KnexQueryResult])
    } as unknown as Knex
  }

  KnexStub = sinon.stub().callsFake(ApiSetLatestPictureTests.GetKnexInstance)

  KnexFake = this.KnexStub as unknown as Knex

  GetPictureFoldersStub?: Sinon.SinonStub

  before () {
    this.GetPictureFoldersStub = sinon.stub(Functions, 'GetPictureFolders').returns([])
  }

  after () {
    this.GetPictureFoldersStub?.restore()
  }

  @test
  async 'it should search for picture and select seen flag' () {
    await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.pdf')
    expect(this.KnexStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['pictures'])
    const knexInstance = this.KnexStub.firstCall.returnValue
    assert(knexInstance)
    expect(knexInstance.select.callCount).to.equal(1)
    expect(knexInstance.select.firstCall.args).to.deep.equal(['seen'])
    expect(knexInstance.where.callCount).to.equal(1)
    expect(knexInstance.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/image.pdf' }])
  }

  @test
  async 'it should abort when picture not found' () {
    await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.png')
    expect(this.KnexStub.callCount).to.equal(1)
  }

  @test
  async 'it should resolve to null when picture not found' () {
    const result = await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.png')
    expect(result).to.equal(null)
  }

  @test
  async 'it should update current image when search for picture finds result' () {
    ApiSetLatestPictureTests.KnexQueryResult = { seen: true }
    await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.pdf')
    expect(this.KnexStub.callCount).to.be.greaterThanOrEqual(2)
    expect(this.KnexStub.lastCall.args).to.deep.equal(['folders'])
    const knexInstance = this.KnexStub.lastCall.returnValue
    assert(knexInstance)
    expect(knexInstance.update.callCount).to.equal(1)
    expect(knexInstance.update.firstCall.args).to.deep.equal([{ current: '/foo/bar/image.pdf' }])
    expect(knexInstance.where.callCount).to.equal(1)
    expect(knexInstance.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/' }])
  }

  @test
  async 'it should not increment seen counts when finding already read image' () {
    ApiSetLatestPictureTests.KnexQueryResult = { seen: true }
    await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.pdf')
    expect(this.KnexStub.callCount).to.be.equal(2)
    expect(this.GetPictureFoldersStub?.callCount).to.equal(0)
  }

  @test
  async 'it should resolve to uri safe folder path when picture is found' () {
    ApiSetLatestPictureTests.KnexQueryResult = { seen: true }
    const result = await Functions.SetLatestPicture(this.KnexFake, '/foo/the bar/image.pdf')
    expect(result).to.equal('/foo/the%20bar/')
  }

  @test
  async 'it should call GetPictureFolders to get parent folders for picture' () {
    ApiSetLatestPictureTests.KnexQueryResult = { seen: false }
    await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.pdf')
    expect(this.GetPictureFoldersStub?.callCount).to.equal(1)
    expect(this.GetPictureFoldersStub?.firstCall.args).to.deep.equal(['/foo/bar/image.pdf'])
  }

  @test
  async 'it should increment seenCount on parent folders when picture is unseen' () {
    ApiSetLatestPictureTests.KnexQueryResult = { seen: false }
    const folders = { folders: Math.random() }
    this.GetPictureFoldersStub?.returns(folders)
    await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.pdf')
    expect(this.KnexStub.callCount).to.be.greaterThan(2)
    const call = this.KnexStub.getCalls().filter(call => call.args[0] === 'folders')[0]
    assert(call)
    expect(call.returnValue.increment.callCount).to.equal(1)
    expect(call.returnValue.increment.firstCall.args).to.deep.equal(['seenCount', 1])
    expect(this.GetPictureFoldersStub?.callCount).to.equal(1)
    expect(this.GetPictureFoldersStub?.firstCall.args).to.deep.equal(['/foo/bar/image.pdf'])
    expect(call.returnValue.whereIn.callCount).to.equal(1)
    expect(call.returnValue.whereIn.firstCall.args).to.have.lengthOf(2)
    expect(call.returnValue.whereIn.firstCall.args[0]).to.equal('path')
    expect(call.returnValue.whereIn.firstCall.args[1]).to.equal(folders)
  }

  @test
  async 'it should mark picture aas seen when picture is unseen' () {
    ApiSetLatestPictureTests.KnexQueryResult = { seen: false }
    await Functions.SetLatestPicture(this.KnexFake, '/foo/bar/image.pdf')
    expect(this.KnexStub.callCount).to.be.greaterThan(2)
    const call = this.KnexStub.getCalls().filter(call => call.args[0] === 'pictures')[1]
    assert(call)
    expect(call.returnValue.update.callCount).to.equal(1)
    expect(call.returnValue.update.firstCall.args).to.deep.equal([{ seen: true }])
    expect(call.returnValue.where.callCount).to.equal(1)
    expect(call.returnValue.where.firstCall.args).to.have.lengthOf(1)
    expect(call.returnValue.where.firstCall.args[0]).to.deep.equal({ path: '/foo/bar/image.pdf' })
  }
}

@suite
export class ApiMarkFolderReadTests {
  static UpdatedPicturesCount = 0
  GetKnexInstance (): Knex {
    return {
      increment: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      where: sinon.stub().returnsThis(),
      whereIn: sinon.stub().resolves([]),
      andWhere: sinon.stub().resolves(ApiMarkFolderReadTests.UpdatedPicturesCount),
      orWhere: sinon.stub().resolves([])
    } as unknown as Knex
  }

  KnexStub = sinon.stub().callsFake(this.GetKnexInstance)

  KnexRawStub = sinon.stub()

  KnexFake = this.KnexStub as unknown as Knex

  GetPictureFoldersStub?: Sinon.SinonStub

  before () {
    ApiMarkFolderReadTests.UpdatedPicturesCount = 0
    this.KnexFake.raw = this.KnexRawStub
    this.GetPictureFoldersStub = sinon.stub(Functions, 'GetPictureFolders').returns([])
  }

  after () {
    this.GetPictureFoldersStub?.restore()
  }

  @test
  async 'it should update pictures table where folder is in given hierarchy and not already read' () {
    await Functions.MarkFolderRead(this.KnexFake, '/foo/bar/baz/quux/')
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['pictures'])
    const knex = this.KnexStub.firstCall.returnValue
    assert(knex)
    expect(knex.update.callCount).to.equal(1)
    expect(knex.update.firstCall.args).to.deep.equal([{ seen: true }])
    expect(knex.where.callCount).to.equal(1)
    expect(knex.where.firstCall.args).to.deep.equal([{ seen: false }])
    expect(knex.andWhere.callCount).to.equal(1)
    expect(knex.andWhere.firstCall.args).to.deep.equal(['folder', 'like', '/foo/bar/baz/quux/%'])
  }

  @test
  async 'it should increment seen counts of parent folders' () {
    ApiMarkFolderReadTests.UpdatedPicturesCount = 5050
    const parentPaths = { parents: Math.random() }
    this.GetPictureFoldersStub?.returns(parentPaths)
    await Functions.MarkFolderRead(this.KnexFake, '/foo/bar/baz/quux/')
    expect(this.KnexStub.callCount).to.equal(3)
    expect(this.KnexStub.secondCall.args).to.deep.equal(['folders'])
    const knex = this.KnexStub.secondCall.returnValue
    assert(knex)
    expect(knex.update.callCount).to.equal(0)
    expect(knex.increment.callCount).to.equal(1)
    expect(knex.increment.firstCall.args).to.deep.equal(['seenCount', 5050])
    expect(knex.where.callCount).to.equal(0)
    expect(this.GetPictureFoldersStub?.callCount).to.equal(1)
    expect(this.GetPictureFoldersStub?.firstCall.args).to.deep.equal(['/foo/bar/baz/quux/'])
    expect(knex.whereIn.callCount).to.equal(1)
    expect(knex.whereIn.firstCall.args).to.have.lengthOf(2)
    expect(knex.whereIn.firstCall.args[0]).to.equal('path')
    expect(knex.whereIn.firstCall.args[1]).to.equal(parentPaths)
    expect(knex.andWhere.callCount).to.equal(0)
  }

  @test
  async 'it should max seen counts of target folder and children folders' () {
    ApiMarkFolderReadTests.UpdatedPicturesCount = 5050
    const rawParam = { knexRaw: Math.random() }
    this.KnexRawStub?.returns(rawParam)
    await Functions.MarkFolderRead(this.KnexFake, '/foo/bar/baz/quux/')
    expect(this.KnexStub.callCount).to.equal(3)
    expect(this.KnexStub.thirdCall.args).to.deep.equal(['folders'])
    const knex = this.KnexStub.thirdCall.returnValue
    assert(knex)
    expect(this.KnexRawStub.callCount).to.equal(1)
    expect(this.KnexRawStub.firstCall.args).to.deep.equal(['"totalCount"'])
    expect(knex.where.callCount).to.equal(1)
    expect(knex.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/baz/quux/%'])
    expect(knex.orWhere.callCount).to.equal(1)
    expect(knex.orWhere.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz/quux/' }])
  }
}

@suite
export class ApiMarkFolderUnreadTests {
  static UpdatedPicturesCount = 0
  GetKnexInstance (): Knex {
    return {
      increment: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      where: sinon.stub().returnsThis(),
      whereIn: sinon.stub().resolves([]),
      andWhere: sinon.stub().resolves(ApiMarkFolderUnreadTests.UpdatedPicturesCount),
      orWhere: sinon.stub().resolves([])
    } as unknown as Knex
  }

  KnexStub = sinon.stub().callsFake(this.GetKnexInstance)

  KnexFake = this.KnexStub as unknown as Knex

  GetPictureFoldersStub?: Sinon.SinonStub

  before () {
    ApiMarkFolderUnreadTests.UpdatedPicturesCount = 0
    this.GetPictureFoldersStub = sinon.stub(Functions, 'GetPictureFolders').returns([])
  }

  after () {
    this.GetPictureFoldersStub?.restore()
  }

  @test
  async 'it should update pictures table where folder is in given hierarchy and is already read' () {
    await Functions.MarkFolderUnread(this.KnexFake, '/foo/bar/baz/quux/')
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['pictures'])
    const knex = this.KnexStub.firstCall.returnValue
    assert(knex)
    expect(knex.update.callCount).to.equal(1)
    expect(knex.update.firstCall.args).to.deep.equal([{ seen: false }])
    expect(knex.where.callCount).to.equal(1)
    expect(knex.where.firstCall.args).to.deep.equal([{ seen: true }])
    expect(knex.andWhere.callCount).to.equal(1)
    expect(knex.andWhere.firstCall.args).to.deep.equal(['folder', 'like', '/foo/bar/baz/quux/%'])
  }

  @test
  async 'it should decrement seen counts of parent folders' () {
    ApiMarkFolderUnreadTests.UpdatedPicturesCount = 5050
    const parentPaths = { parents: Math.random() }
    this.GetPictureFoldersStub?.returns(parentPaths)
    await Functions.MarkFolderUnread(this.KnexFake, '/foo/bar/baz/quux/')
    expect(this.KnexStub.callCount).to.equal(3)
    expect(this.KnexStub.secondCall.args).to.deep.equal(['folders'])
    const knex = this.KnexStub.secondCall.returnValue
    assert(knex)
    expect(knex.update.callCount).to.equal(0)
    expect(knex.increment.callCount).to.equal(1)
    expect(knex.increment.firstCall.args).to.deep.equal(['seenCount', -5050])
    expect(knex.where.callCount).to.equal(0)
    expect(this.GetPictureFoldersStub?.callCount).to.equal(1)
    expect(this.GetPictureFoldersStub?.firstCall.args).to.deep.equal(['/foo/bar/baz/quux/'])
    expect(knex.whereIn.callCount).to.equal(1)
    expect(knex.whereIn.firstCall.args).to.have.lengthOf(2)
    expect(knex.whereIn.firstCall.args[0]).to.equal('path')
    expect(knex.whereIn.firstCall.args[1]).to.equal(parentPaths)
    expect(knex.andWhere.callCount).to.equal(0)
  }

  @test
  async 'it should reset seen counts of target folder and children folders' () {
    ApiMarkFolderUnreadTests.UpdatedPicturesCount = 5050
    await Functions.MarkFolderUnread(this.KnexFake, '/foo/bar/baz/quux/')
    expect(this.KnexStub.callCount).to.equal(3)
    expect(this.KnexStub.thirdCall.args).to.deep.equal(['folders'])
    const knex = this.KnexStub.thirdCall.returnValue
    assert(knex)
    expect(knex.update.callCount).to.equal(1)
    expect(knex.update.firstCall.args).to.deep.equal([{ seenCount: 0, current: null }])
    expect(knex.where.callCount).to.equal(1)
    expect(knex.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/baz/quux/%'])
    expect(knex.orWhere.callCount).to.equal(1)
    expect(knex.orWhere.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz/quux/' }])
  }
}

@suite
export class ApiAddBookmarkstests {
  KnexInstance = {
    insert: sinon.stub().returnsThis(),
    onConflict: sinon.stub().returnsThis(),
    ignore: sinon.stub().resolves()
  }

  KnexStub = sinon.stub().returns(this.KnexInstance)

  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should query on bookmarks table' () {
    await Functions.AddBookmark(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['bookmarks'])
  }

  @test
  async 'it should insert provided path' () {
    await Functions.AddBookmark(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexInstance.insert.callCount).to.equal(1)
    expect(this.KnexInstance.insert.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz.png' }])
  }

  @test
  async 'it should onConflict ignore the insert' () {
    await Functions.AddBookmark(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexInstance.onConflict.callCount).to.equal(1)
    expect(this.KnexInstance.onConflict.firstCall.args).to.deep.equal(['path'])
    expect(this.KnexInstance.ignore.callCount).to.equal(1)
    expect(this.KnexInstance.ignore.firstCall.args).to.have.lengthOf(0)
  }
}

@suite
export class ApiRemoveBookmarkstests {
  KnexInstance = {
    where: sinon.stub().returnsThis(),
    delete: sinon.stub().resolves()
  }

  KnexStub = sinon.stub().returns(this.KnexInstance)

  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should query on bookmarks table' () {
    await Functions.RemoveBookmark(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['bookmarks'])
  }

  @test
  async 'it should filter to exactly provided path' () {
    await Functions.RemoveBookmark(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexInstance.where.callCount).to.equal(1)
    expect(this.KnexInstance.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz.png' }])
  }

  @test
  async 'it should delete results' () {
    await Functions.RemoveBookmark(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexInstance.delete.callCount).to.equal(1)
    expect(this.KnexInstance.delete.firstCall.args).to.have.lengthOf(0)
  }
}
