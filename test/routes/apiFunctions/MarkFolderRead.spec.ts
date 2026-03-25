'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import { StubToKnex } from '../../../testutils/TypeGuards'
import Sinon from 'sinon'
import { createKnexChainFake } from '../../../testutils/Knex'

const sandbox = Sinon.createSandbox()

const chainMethods = ['select', 'increment', 'update', 'where'] as const
const terminalMethods = ['whereIn', 'orWhere', 'andWhere'] as const
describe('routes/apiFunctions function MarkFolderRead', () => {
  let knexStub = Sinon.stub()
  let knexFake = StubToKnex(knexStub)
  let knexRawStub = Sinon.stub()
  let getPictureFoldersStub = Sinon.stub()
  beforeEach(() => {
    knexStub = Sinon.stub().callsFake(() => createKnexChainFake(chainMethods, terminalMethods).instance)
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
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
  })
  it('should update setting seen flag with expected args for called path', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.firstCall.args).to.deep.equal([{ seen: true }])
  })
  it('should update filtering only unseen pictures once for called path', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
  })
  it('should update filtering only unseen pictures with expected args for called path', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.firstCall.args).to.deep.equal([{ seen: false }])
  })
  it('should update filtering paths prefixed with called path once', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.andWhere.callCount).to.equal(1)
  })
  it('should update filtering paths prefixed with called path with expected args', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.andWhere.firstCall.args).to.deep.equal(['folder', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should query folders table 3 times when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should query folders table on second call when updating parent seenCount', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.secondCall.args).to.deep.equal(['folders'])
  })
  it('should increment seenCount once when updating parent folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.increment.callCount).to.equal(1)
  })
  it('should increment seenCount with expected args when updating parent folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.increment.firstCall.args).to.deep.equal(['seenCount', 3.1415926])
  })
  it('should use GetPictureFolders once to find parent folders when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(getPictureFoldersStub.callCount).to.equal(1)
  })
  it('should use GetPictureFolders with expected args to find parent folders when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(getPictureFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/baz/quux/'])
  })
  it('should filter folders in list of parent folders once when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.whereIn.callCount).to.equal(1)
  })
  it('should filter folders in list of parent folders with expected args when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.whereIn.firstCall.args).to.deep.equal(['path', 'FOOBAR'])
  })
  it('should query folders table on third call when updating child seenCount', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should query folders table with expected args on third call when updating child seenCount', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.thirdCall.args).to.deep.equal(['folders'])
  })
  it('should use knexRaw once to update seen count for child folders when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexRawStub.callCount).to.equal(1)
  })
  it('should use knexRaw with expected args to update seen count for child folders when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(knexRawStub.firstCall.args).to.deep.equal(['"totalCount"'])
  })
  it('should update once with knexRaw result for child seen count when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
  })
  it('should update with knexRaw result for child seen count when updates update pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.firstCall.args).to.deep.equal([{ seenCount: 2.71828 }])
  })
  it('should filter child folders once when updating seen count for child folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
  })
  it('should filter child folders with expected args when updating seen count for child folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should include selected folder once when updating seen count for child folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.orWhere.callCount).to.equal(1)
  })
  it('should include selected folder with expected args when updating seen count for child folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    knexRawStub.returns(2.71828)
    await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
    expect(instance.orWhere.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz/quux/' }])
  })
  const updateCountTests: Array<[string, number, number]> = [
    ['should update folders when exactly one picture is marked read', 1, 3],
    ['should not update folders when update count is zero', 0, 1],
    ['should not update folders when update count is negative', -1, 1],
  ]
  updateCountTests.forEach(([title, resolvedCount, expectedCallCount]) => {
    it(title, async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(resolvedCount)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderRead(knexFake, '/foo/bar/baz/quux/')
      expect(knexStub.callCount).to.equal(expectedCallCount)
    })
  })
})
