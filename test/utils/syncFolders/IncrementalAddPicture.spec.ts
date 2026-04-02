'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalAddPicture()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let picturesStub = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    insert: Sinon.stub().resolves(),
    first: Sinon.stub().resolves(undefined),
  }
  let foldersStub = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    insert: Sinon.stub().returnsThis(),
    first: Sinon.stub().resolves(undefined),
    onConflict: Sinon.stub().returnsThis(),
    ignore: Sinon.stub().resolves(),
  }
  let knexFnStub = Sinon.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(Sinon.stub()))
    picturesStub = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      insert: Sinon.stub().resolves(),
      first: Sinon.stub().resolves(undefined),
    }
    foldersStub = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      insert: Sinon.stub().returnsThis(),
      first: Sinon.stub().resolves(undefined),
      onConflict: Sinon.stub().returnsThis(),
      ignore: Sinon.stub().resolves(),
    }
    knexFnStub = Sinon.stub()
    knexFnStub.withArgs('pictures').returns(picturesStub)
    knexFnStub.withArgs('folders').returns(foldersStub)
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check if picture already exists', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(picturesStub.where.firstCall.args[0]).to.deep.equal({ path: '/comics/page.jpg' })
    expect(picturesStub.first.callCount).to.be.above(0)
  })

  it('should not insert if picture already exists', async () => {
    picturesStub.first.resolves({ path: '/comics/page.jpg' })
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(picturesStub.insert.callCount).to.equal(0)
  })

  it('should insert new picture when it does not exist', async () => {
    picturesStub.first.resolves(undefined)
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(picturesStub.insert.callCount).to.equal(1)
  })

  it('should insert picture with correct folder', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    const inserted = Cast<Record<string, unknown>>(picturesStub.insert.firstCall.args[0])
    expect(inserted.folder).to.equal('/comics/')
  })

  it('should insert picture with correct path', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    const inserted = Cast<Record<string, unknown>>(picturesStub.insert.firstCall.args[0])
    expect(inserted.path).to.equal('/comics/page.jpg')
  })

  it('should insert picture with a pathHash', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    const inserted = Cast<Record<string, unknown>>(picturesStub.insert.firstCall.args[0])
    expect(inserted.pathHash).to.be.a('string')
    expect(Cast<string>(inserted.pathHash).length).to.be.above(0)
  })

  it('should insert picture with a sortKey', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    const inserted = Cast<Record<string, unknown>>(picturesStub.insert.firstCall.args[0])
    expect(inserted.sortKey).to.be.a('string')
  })

  it('should check if folder exists when inserting a new picture', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(foldersStub.where.called).to.equal(true)
  })

  it('should create folder if it does not exist', async () => {
    foldersStub.first.resolves(undefined)
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(foldersStub.insert.called).to.equal(true)
  })

  it('should not create folder if it already exists', async () => {
    foldersStub.first.resolves({ path: '/comics/' })
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(foldersStub.insert.callCount).to.equal(0)
  })

  it('should use onConflict ignore when creating folder', async () => {
    foldersStub.first.resolves(undefined)
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(foldersStub.onConflict.calledWith('path')).to.equal(true)
    expect(foldersStub.ignore.callCount).to.equal(1)
  })

  it('should log the incremental add', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(loggerStub.calledWith('Incremental add: /comics/page.jpg')).to.equal(true)
  })

  it('should handle root-level file with / as folder', async () => {
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/image.jpg')
    const inserted = Cast<Record<string, unknown>>(picturesStub.insert.firstCall.args[0])
    expect(inserted.folder).to.equal('/')
  })

  it('should set non-root parent folder for deeply nested path', async () => {
    foldersStub.first.resolves(undefined)
    await Functions.IncrementalAddPicture(loggerFake, knexFnFake, '/a/b/page.jpg')
    const folderInsert = Cast<Record<string, unknown>>(foldersStub.insert.firstCall.args[0])
    expect(folderInsert.folder).to.equal('/a/')
  })
})
