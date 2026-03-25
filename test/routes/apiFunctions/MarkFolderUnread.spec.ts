'use sanity'

import { expect } from 'chai'
import { Functions } from '#routes/apiFunctions'
import { StubToKnex } from '#testutils/TypeGuards'
import Sinon from 'sinon'
import { createKnexChainFake } from '#testutils/Knex'

const sandbox = Sinon.createSandbox()

const chainMethods = ['select', 'increment', 'update', 'where'] as const
const terminalMethods = ['whereIn', 'orWhere', 'andWhere'] as const
describe('routes/apiFunctions function MarkFolderUnread', () => {
  let knexStub = Sinon.stub()
  let knexFake = StubToKnex(knexStub)
  let getPictureFoldersStub = Sinon.stub()
  beforeEach(() => {
    knexStub = Sinon.stub().callsFake(() => createKnexChainFake(chainMethods, terminalMethods).instance)
    knexFake = StubToKnex(knexStub)
    getPictureFoldersStub = sandbox.stub(Functions, 'GetPictureFolders').returns([])
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call knex once when updating pictures table', async () => {
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should update pictures table', async () => {
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should call update once when clearing seen flag', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
  })
  it('should update clearing seen flag for called path', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.firstCall.args).to.deep.equal([{ seen: false }])
  })
  it('should call where once when filtering seen pictures', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
  })
  it('should filter only seen pictures for called path', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.firstCall.args).to.deep.equal([{ seen: true }])
  })
  it('should call andWhere once when filtering by path prefix', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.andWhere.callCount).to.equal(1)
  })
  it('should filter paths prefixed with called path', async () => {
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.andWhere.firstCall.args).to.deep.equal(['folder', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should call knex three times when updates affect pictures', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should update folders table for parent seenCount', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.secondCall.args).to.deep.equal(['folders'])
  })
  it('should call increment once when decrementing seenCount', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.increment.callCount).to.equal(1)
  })
  it('should decrement seenCount for parent folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.increment.firstCall.args).to.deep.equal(['seenCount', -3.1415926])
  })
  it('should call GetPictureFolders once when finding parent folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(getPictureFoldersStub.callCount).to.equal(1)
  })
  it('should pass called path to GetPictureFolders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(getPictureFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/baz/quux/'])
  })
  it('should call whereIn once when filtering parent folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.whereIn.callCount).to.equal(1)
  })
  it('should filter folders in list of parent folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
    getPictureFoldersStub.returns('FOOBAR')
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.whereIn.firstCall.args).to.deep.equal(['path', 'FOOBAR'])
  })
  it('should call knex three times when updating child folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.callCount).to.equal(3)
  })
  it('should update folders table for child seenCount reset', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(knexStub.thirdCall.args).to.deep.equal(['folders'])
  })
  it('should call update once when resetting child folder seen count', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.callCount).to.equal(1)
  })
  it('should reset seenCount and current picture for child folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.update.firstCall.args).to.deep.equal([{ seenCount: 0, current: null }])
  })
  it('should call where once when filtering child folders', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.callCount).to.equal(1)
  })
  it('should filter exactly child folders by path prefix', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/baz/quux/%'])
  })
  it('should call orWhere once when including selected folder', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.orWhere.callCount).to.equal(1)
  })
  it('should include selected folder in update', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(3.1415926)
    const instance = createKnexChainFake(chainMethods, terminalMethods).instance
    knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
    await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
    expect(instance.orWhere.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz/quux/' }])
  })
  const updateCountTests: Array<[string, number, number]> = [
    ['should update folders when exactly one picture is marked unread', 1, 3],
    ['should not update folders when update count is zero', 0, 1],
    ['should not update folders when update count is negative', -1, 1],
  ]
  updateCountTests.forEach(([title, resolvedCount, expectedCallCount]) => {
    it(title, async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(resolvedCount)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderUnread(knexFake, '/foo/bar/baz/quux/')
      expect(knexStub.callCount).to.equal(expectedCallCount)
    })
  })
})
