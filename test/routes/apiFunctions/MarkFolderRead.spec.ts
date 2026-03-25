'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import { StubToKnex } from '../../../testutils/TypeGuards'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

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
    getPictureFoldersStub = sandbox.stub(Functions, 'GetPictureFolders').returns([])
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should update pictures table once to set pictures read', async () => {
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should update pictures table with expected args to set pictures read', async () => {
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should update setting seen flag once for called path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
  })
  it('should update setting seen flag with expected args for called path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.firstCall.args).to.deep.equal([{ seen: true }])
  })
  it('should update filtering only unseen pictures once for called path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
  })
  it('should update filtering only unseen pictures with expected args for called path', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.firstCall.args).to.deep.equal([{ seen: false }])
  })
  it('should update filtering paths prefixed with called path once', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.andWhere.callCount).to.equal(1)
  })
  it('should update filtering paths prefixed with called path with expected args', async () => {
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.andWhere.firstCall.args).to.deep.equal(['folder', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should query folders table 3 times when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should query folders table on second call when updating parent seenCount', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.secondCall.args).to.deep.equal(['folders'])
  })
  it('should increment seenCount once when updating parent folders', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.increment.callCount).to.equal(1)
  })
  it('should increment seenCount with expected args when updating parent folders', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.increment.firstCall.args).to.deep.equal(['seenCount', 3.1415926])
  })
  it('should use GetPictureFolders once to find parent folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(getPictureFoldersStub.callCount).to.equal(1)
  })
  it('should use GetPictureFolders with expected args to find parent folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(getPictureFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/baz/quux/'])
  })
  it('should filter folders in list of parent folders once when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.whereIn.callCount).to.equal(1)
  })
  it('should filter folders in list of parent folders with expected args when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.whereIn.firstCall.args).to.deep.equal(['path', 'FOOBAR'])
  })
  it('should query folders table on third call when updating child seenCount', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should query folders table with expected args on third call when updating child seenCount', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.thirdCall.args).to.deep.equal(['folders'])
  })
  it('should use knexRaw once to update seen count for child folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexRawStub.callCount).to.equal(1)
  })
  it('should use knexRaw with expected args to update seen count for child folders when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexRawStub.firstCall.args).to.deep.equal(['"totalCount"'])
  })
  it('should update once with knexRaw result for child seen count when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
  })
  it('should update with knexRaw result for child seen count when updates update pictures', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.firstCall.args).to.deep.equal([{ seenCount: 2.71828 }])
  })
  it('should filter child folders once when updating seen count for child folders', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
  })
  it('should filter child folders with expected args when updating seen count for child folders', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should include selected folder once when updating seen count for child folders', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.orWhere.callCount).to.equal(1)
  })
  it('should include selected folder with expected args when updating seen count for child folders', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(3.1415926)
    const instance = makeKnexInstance()
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.orWhere.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz/quux/' }])
  })
  it('should update folders when exactly one picture is marked read', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(1)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should not update folders when update count is zero', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(0)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should not update folders when update count is negative', async () => {
    const query = makeKnexInstance()
    query.andWhere.resolves(-1)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(1)
  })
})
