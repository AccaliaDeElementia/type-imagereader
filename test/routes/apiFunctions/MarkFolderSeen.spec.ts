'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#routes/apiFunctions.js'
import { StubToKnex } from '#testutils/TypeGuards.js'
import Sinon from 'sinon'
import { createKnexChainFake } from '#testutils/Knex.js'

const sandbox = Sinon.createSandbox()

const chainMethods = ['select', 'increment', 'update', 'where'] as const
const terminalMethods = ['whereIn', 'orWhere', 'andWhere'] as const
describe('routes/apiFunctions function MarkFolderSeen', () => {
  let knexStub = sandbox.stub()
  let knexFake = StubToKnex(knexStub)
  let knexRawStub = sandbox.stub()
  let getParentFoldersStub = sandbox.stub()
  let loggerStub: Sinon.SinonStub = sandbox.stub()
  beforeEach(() => {
    knexStub = sandbox.stub().callsFake(() => createKnexChainFake(chainMethods, terminalMethods).instance)
    knexFake = StubToKnex(knexStub)
    knexRawStub = sandbox.stub()
    knexFake.raw = knexRawStub
    getParentFoldersStub = sandbox.stub(Imports, 'GetParentFolders').returns([])
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  describe('with markAsSeen = true', () => {
    it('should update pictures table once to set pictures read', async () => {
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.callCount).to.equal(1)
    })
    it('should update pictures table with expected args to set pictures read', async () => {
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.firstCall.args).to.deep.equal(['pictures'])
    })
    it('should update setting seen flag once for called path', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.callCount).to.equal(1)
    })
    it('should update setting seen flag with expected args for called path', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.firstCall.args).to.deep.equal([{ seen: true }])
    })
    it('should update filtering only unseen pictures once for called path', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.callCount).to.equal(1)
    })
    it('should update filtering only unseen pictures with expected args for called path', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.firstCall.args).to.deep.equal([{ seen: false }])
    })
    it('should update filtering paths prefixed with called path once', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.andWhere.callCount).to.equal(1)
    })
    it('should update filtering paths prefixed with called path with expected args', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.andWhere.firstCall.args).to.deep.equal(['folder', 'like', '/foo/bar/baz/quux/%'])
    })
    it('should query folders table 3 times when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.callCount).to.equal(3)
    })
    it('should query folders table on second call when updating parent seenCount', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.secondCall.args).to.deep.equal(['folders'])
    })
    it('should increment seenCount once when updating parent folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.increment.callCount).to.equal(1)
    })
    it('should increment seenCount with positive update count when marking as seen', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.increment.firstCall.args).to.deep.equal(['seenCount', 3.1415926])
    })
    it('should use GetParentFolders once to find parent folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(getParentFoldersStub.callCount).to.equal(1)
    })
    it('should use GetParentFolders with expected args to find parent folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(getParentFoldersStub.firstCall.args).to.deep.equal(['/foo/bar/baz/quux/'])
    })
    it('should filter folders in list of parent folders once when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
      getParentFoldersStub.returns('FOOBAR')
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.whereIn.callCount).to.equal(1)
    })
    it('should filter folders in list of parent folders with expected args when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
      getParentFoldersStub.returns('FOOBAR')
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.whereIn.firstCall.args).to.deep.equal(['path', 'FOOBAR'])
    })
    it('should query folders table on third call when updating child seenCount', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.callCount).to.equal(3)
    })
    it('should query folders table with expected args on third call when updating child seenCount', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.thirdCall.args).to.deep.equal(['folders'])
    })
    it('should use knexRaw once to update seen count for child folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexRawStub.callCount).to.equal(1)
    })
    it('should use knexRaw with expected args to update seen count for child folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexRawStub.firstCall.args).to.deep.equal(['"totalCount"'])
    })
    it('should update once with knexRaw result for child seen count when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      knexRawStub.returns(2.71828)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.callCount).to.equal(1)
    })
    it('should update with knexRaw result for child seen count when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      knexRawStub.returns(2.71828)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.firstCall.args).to.deep.equal([{ seenCount: 2.71828 }])
    })
    it('should filter child folders once when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      knexRawStub.returns(2.71828)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.callCount).to.equal(1)
    })
    it('should filter child folders with expected args when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      knexRawStub.returns(2.71828)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/baz/quux/%'])
    })
    it('should include selected folder once when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      knexRawStub.returns(2.71828)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.orWhere.callCount).to.equal(1)
    })
    it('should include selected folder with expected args when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      knexRawStub.returns(2.71828)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.orWhere.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz/quux/' }])
    })
    it('should update folders when exactly one picture is marked read', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(1)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.callCount).to.equal(3)
    })
    it('should not update folders when update count is zero', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(0)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.callCount).to.equal(1)
    })
    it('should not update folders when update count is negative', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(-1)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.callCount).to.equal(1)
    })
  })
  describe('with markAsSeen = false', () => {
    it('should update setting seen flag to false', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.update.firstCall.args).to.deep.equal([{ seen: false }])
    })
    it('should filter only seen pictures', async () => {
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.where.firstCall.args).to.deep.equal([{ seen: true }])
    })
    it('should decrement seenCount for parent folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onSecondCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.increment.firstCall.args).to.deep.equal(['seenCount', -3.1415926])
    })
    it('should reset seenCount and current for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      const instance = createKnexChainFake(chainMethods, terminalMethods).instance
      knexStub.onFirstCall().returns(query).onThirdCall().returns(instance)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.update.firstCall.args).to.deep.equal([{ seenCount: 0, current: null }])
    })
    it('should not use knexRaw when marking as unseen', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(3.1415926)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexRawStub.callCount).to.equal(0)
    })
    it('should update folders when exactly one picture is marked unread', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(1)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexStub.callCount).to.equal(3)
    })
    it('should not update folders when update count is zero', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(0)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexStub.callCount).to.equal(1)
    })
    it('should not update folders when update count is negative', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.resolves(-1)
      knexStub.onFirstCall().returns(query)
      await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexStub.callCount).to.equal(1)
    })
  })
  it('should log when zero rows are updated for marking seen', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.resolves(0)
    knexStub.onFirstCall().returns(query)
    await Functions.MarkFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('MarkFolderSeen: no rows updated'))
    expect(matched).to.equal(true)
  })
})
