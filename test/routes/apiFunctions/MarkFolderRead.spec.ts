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
  andWhere: Sinon.SinonStub
  where: Sinon.SinonStub
}
const makeKnexInstance = (): KnexStub => ({
  select: Sinon.stub().returnsThis(),
  increment: Sinon.stub().returnsThis(),
  update: Sinon.stub().returnsThis(),
  whereIn: Sinon.stub().resolves([]),
  orWhere: Sinon.stub().resolves([]),
  andWhere: Sinon.stub().resolves(0),
  where: Sinon.stub().returnsThis(),
})
describe('routes/apiFunctions function MarkFolderRead', () => {
  let knexStub = Sinon.stub()
  let knexFake = StubToKnex(knexStub)
  let knexRawStub = Sinon.stub()
  let getPictureFoldersStub = Sinon.stub()
  beforeEach(() => {
    knexStub = Sinon.stub().callsFake(() => StubToKnex(makeKnexInstance()))
    knexFake = StubToKnex(knexStub)
    knexRawStub = Sinon.stub()
    knexFake.raw = knexRawStub
    getPictureFoldersStub = Sinon.stub(Functions, 'GetPictureFolders').returns([])
  })
  afterEach(() => {
    getPictureFoldersStub.restore()
  })
  it('should update for pictures table to set pictures read', async () => {
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should update setting seen flag for called path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
    expect(instance.update.firstCall.args).to.deep.equal([{ seen: true }])
  })
  it('should update filtering only unseen pictures for called path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
    expect(instance.where.firstCall.args).to.deep.equal([{ seen: false }])
  })
  it('should update filtering paths prefixed with called path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.andWhere.callCount).to.equal(1)
    expect(instance.andWhere.firstCall.args).to.deep.equal(['folder', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should update seenCount parent folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
    expect(knexStub.secondCall.args).to.deep.equal(['folders'])
  })
  it('should update seenCount parent folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.increment.callCount).to.equal(1)
    expect(instance.increment.firstCall.args).to.deep.equal(['seenCount', 3.1415926])
  })
  it('should use GetPictureFolders to find parent folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(getPictureFoldersStub.callCount).to.equal(1)
    expect(getPictureFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/baz/quux/'])
  })
  it('should filter folders in list of parent folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.whereIn.callCount).to.equal(1)
    expect(instance.whereIn.firstCall.args).to.deep.equal(['path', 'FOOBAR'])
  })
  it('should update seen count to equal for child folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
    expect(knexStub.thirdCall.args).to.deep.equal(['folders'])
  })
  it('should use knexRaw to update seen count for child folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexRawStub.callCount).to.equal(1)
    expect(knexRawStub.firstCall.args).to.deep.equal(['"totalCount"'])
  })
  it('should use results of knexRaw to update seen count for child folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
    expect(instance.update.firstCall.args).to.deep.equal([{ seenCount: 2.71828 }])
  })
  it('should update seen count for exactly child folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
    expect(instance.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should update seen count for selected folder when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.orWhere.callCount).to.equal(1)
    expect(instance.orWhere.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz/quux/' }])
  })
})
