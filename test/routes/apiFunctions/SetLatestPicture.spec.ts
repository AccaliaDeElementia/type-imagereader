'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import { StubToKnex } from '../../testutils/TypeGuards'
import Sinon from 'sinon'

interface KnexStub {
  select: Sinon.SinonStub
  increment: Sinon.SinonStub
  update: Sinon.SinonStub
  whereIn: Sinon.SinonStub
  orWhere: Sinon.SinonStub
  where: Sinon.SinonStub
}
const makeKnexInstance = (): KnexStub => ({
  select: Sinon.stub().returnsThis(),
  increment: Sinon.stub().returnsThis(),
  update: Sinon.stub().returnsThis(),
  whereIn: Sinon.stub().resolves([]),
  orWhere: Sinon.stub().resolves([]),
  where: Sinon.stub().resolves([]),
})
describe('routes/apiFunctions function SetLatestPicture', () => {
  let knexStub = Sinon.stub()
  let knexFake = StubToKnex(knexStub)
  let getPictureFoldersStub = Sinon.stub()
  beforeEach(() => {
    knexStub = Sinon.stub().callsFake(() => StubToKnex(makeKnexInstance()))
    knexFake = StubToKnex(knexStub)
    getPictureFoldersStub = Sinon.stub(Functions, 'GetPictureFolders').returns([])
  })
  afterEach(() => {
    getPictureFoldersStub.restore()
  })
  it('should search for picture in the pictures table', async () => {
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should select seen column from pictures table while searching', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.select.callCount).to.be.equal(1)
    expect(instance.select.firstCall.args).to.deep.equal(['seen'])
  })
  it('should filter pictures table by provided path while searching', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.callCount).to.be.equal(1)
    expect(instance.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/image.pdf' }])
  })
  it('should resolve to null when path is not found', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    instance.where.resolves([])
    const result = await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(result).to.equal(null)
  })
  it('should make no additional knex calls when picture not found', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    instance.where.resolves([])
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should query folders to update when seen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: true }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(1).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(2)
    expect(knexStub.getCall(1).args).to.deep.equal(['folders'])
  })
  it('should update current column to selected picture path when seen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: true }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(1).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.update.callCount).to.equal(1)
    expect(instance.update.getCall(0).args).to.deep.equal([{ current: '/foo/bar/image.pdf' }])
  })
  it('should update by folder name when seen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: true }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(1).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.callCount).to.equal(1)
    expect(instance.where.getCall(0).args).to.deep.equal([{ path: '/foo/bar/' }])
  })
  it('should query folders to increment seen count when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(1).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(4)
    expect(knexStub.getCall(1).args).to.deep.equal(['folders'])
  })
  it('should increment seen count when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(1).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.increment.callCount).to.equal(1)
    expect(instance.increment.getCall(0).args).to.deep.equal(['seenCount', 1])
  })
  it('should use GetPictureFolders tp get parent folders when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(1).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(getPictureFoldersStub.callCount).to.equal(1)
    expect(getPictureFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/image.pdf'])
  })
  it('should increment seen count when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(1).returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.whereIn.callCount).to.equal(1)
    expect(instance.whereIn.getCall(0).args).to.deep.equal(['path', 'FOOBAR'])
  })
  it('should query pictures to set seen flag when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(2).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(4)
    expect(knexStub.getCall(2).args).to.deep.equal(['pictures'])
  })
  it('should update pictures to set seen flag when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(2).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.update.callCount).to.equal(1)
    expect(instance.update.getCall(0).args).to.deep.equal([{ seen: true }])
  })
  it('should select picture using path to set seen flag when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(2).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.callCount).to.equal(1)
    expect(instance.where.getCall(0).args).to.deep.equal([{ path: '/foo/bar/image.pdf' }])
  })
  it('should query folders to update when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(3).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.callCount).to.equal(4)
    expect(knexStub.getCall(3).args).to.deep.equal(['folders'])
  })
  it('should update current column to selected picture path when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(3).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.update.callCount).to.equal(1)
    expect(instance.update.getCall(0).args).to.deep.equal([{ current: '/foo/bar/image.pdf' }])
  })
  it('should update by folder name when unseen picture is found', async () => {
    const searcher = makeKnexInstance()
    searcher.where.resolves([{ seen: false }])
    knexStub.onCall(0).returns(searcher)
    const instance = makeKnexInstance()
    knexStub.onCall(3).returns(instance)
    await Functions.SetLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.callCount).to.equal(1)
    expect(instance.where.getCall(0).args).to.deep.equal([{ path: '/foo/bar/' }])
  })
})
