'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'
import { expect } from 'chai'
import { Functions } from '../../../routes/slideshow'

describe('routes/slideshow function GetImages()', () => {
  let knexQueryOne = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().resolves(),
  }
  let knexQueryTwo = {
    increment: Sinon.stub().returnsThis(),
    whereIn: Sinon.stub().resolves(),
  }
  let knexQueryThree = {
    update: Sinon.stub().returnsThis(),
    where: Sinon.stub().resolves(),
  }
  let knexStub = Sinon.stub()
    .onFirstCall()
    .returns(knexQueryOne)
    .onSecondCall()
    .returns(knexQueryTwo)
    .onThirdCall()
    .returns(knexQueryThree)

  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexQueryOne = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().resolves(),
    }
    knexQueryTwo = {
      increment: Sinon.stub().returnsThis(),
      whereIn: Sinon.stub().resolves(),
    }
    knexQueryThree = {
      update: Sinon.stub().returnsThis(),
      where: Sinon.stub().resolves(),
    }
    knexStub = Sinon.stub()
      .onFirstCall()
      .returns(knexQueryOne)
      .onSecondCall()
      .returns(knexQueryTwo)
      .onThirdCall()
      .returns(knexQueryThree)

    knexFake = StubToKnex(knexStub)
  })
  const picWhereQuery = { seen: false, path: '/foo/bar/baz.png' }
  const incrementFilter = ['path', ['/foo/bar/', '/foo/', '/']]
  const updateFlags = { seen: true }
  const updateFilter = { path: '/foo/bar/baz.png' }
  const tests: Array<[string, unknown, () => void]> = [
    ['make single knex call when null results found', null, () => expect(knexStub.callCount).to.equal(1)],
    ['make single knex call when undefined results found', undefined, () => expect(knexStub.callCount).to.equal(1)],
    ['make single knex call when no results found', [], () => expect(knexStub.callCount).to.equal(1)],
    ['make all knex call when no results found', [{}], () => expect(knexStub.callCount).to.equal(3)],
    ['query pictures table to find image', [], () => expect(knexStub.firstCall.args).to.deep.equal(['pictures'])],
    ['select from pictures table', [], () => expect(knexQueryOne.select.callCount).to.equal(1)],
    ['select only seen flag', [], () => expect(knexQueryOne.select.firstCall.args).to.deep.equal(['seen'])],
    ['filter pictures query', [], () => expect(knexQueryOne.where.callCount).to.equal(1)],
    ['filter by path+seen', [], () => expect(knexQueryOne.where.firstCall.args).to.deep.equal([picWhereQuery])],
    ['query folder to increment', [{}], () => expect(knexStub.secondCall.args).to.deep.equal(['folders'])],
    ['increment folder query', [{}], () => expect(knexQueryTwo.increment.callCount).to.equal(1)],
    ['increment seenCount', [{}], () => expect(knexQueryTwo.increment.firstCall.args).to.deep.equal(['seenCount', 1])],
    ['filter increment query in', [{}], () => expect(knexQueryTwo.whereIn.callCount).to.equal(1)],
    ['filter increment paths', [{}], () => expect(knexQueryTwo.whereIn.firstCall.args).to.deep.equal(incrementFilter)],
    ['query pictures to update flags', [{}], () => expect(knexStub.thirdCall.args).to.deep.equal(['pictures'])],
    ['update pictures table', [{}], () => expect(knexQueryThree.update.callCount).to.equal(1)],
    ['update seen flag', [{}], () => expect(knexQueryThree.update.firstCall.args).to.deep.equal([updateFlags])],
    ['filter update query', [{}], () => expect(knexQueryThree.where.callCount).to.equal(1)],
    ['filter by path', [{}], () => expect(knexQueryThree.where.firstCall.args).to.deep.equal([updateFilter])],
  ]
  tests.forEach(([title, results, validationFn]) => {
    it(`should ${title}`, async () => {
      knexQueryOne.where.resolves(results)
      await Functions.MarkImageRead(knexFake, '/foo/bar/baz.png')
      validationFn()
    })
  })
})
