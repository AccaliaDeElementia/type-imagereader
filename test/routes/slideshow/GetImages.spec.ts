'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'
import { expect } from 'chai'
import { Functions } from '../../../routes/slideshow'

describe('routes/slideshow function GetImages()', () => {
  let knexInstanceStub = {
    select: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    orderBy: Sinon.stub().returnsThis(),
    offset: Sinon.stub().returnsThis(),
    limit: Sinon.stub().resolves([]),
  }
  let knexStub = Sinon.stub().returns(knexInstanceStub)
  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexInstanceStub = {
      select: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      orderBy: Sinon.stub().returnsThis(),
      offset: Sinon.stub().returnsThis(),
      limit: Sinon.stub().resolves([{ path: '1' }, { path: '2' }, { path: '3' }, { path: '4' }, { path: '5' }]),
    }
    knexStub = Sinon.stub().returns(knexInstanceStub)
    knexFake = StubToKnex(knexStub)
  })
  const tests: Array<[string, number, number, (data: string[]) => void]> = [
    ['make a knex query', 0, 40, () => expect(knexStub.callCount).to.equal(1)],
    ['operate on pictures table', 0, 40, () => expect(knexStub.firstCall.args).to.deep.equal(['pictures'])],
    ['select data', 0, 40, () => expect(knexInstanceStub.select.callCount).to.equal(1)],
    ['select only path column', 0, 40, () => expect(knexInstanceStub.select.firstCall.args).to.deep.equal(['path'])],
    ['filter records with where clause', 0, 40, () => expect(knexInstanceStub.where.callCount).to.equal(1)],
    [
      'filter by path prefix',
      0,
      40,
      () => expect(knexInstanceStub.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar%']),
    ],
    ['order by first and second order sorts', 0, 40, () => expect(knexInstanceStub.orderBy.callCount).to.equal(2)],
    ['sort first by see flag', 0, 40, () => expect(knexInstanceStub.orderBy.firstCall.args).to.deep.equal(['seen'])],
    [
      'sort second by pathHash column',
      0,
      40,
      () => expect(knexInstanceStub.orderBy.secondCall.args).to.deep.equal(['pathHash']),
    ],
    ['offset into results', 0, 40, () => expect(knexInstanceStub.offset.callCount).to.equal(1)],
    ['offset by expected amount', 3, 40, () => expect(knexInstanceStub.offset.firstCall.args).to.deep.equal([120])],
    ['limit results', 0, 40, () => expect(knexInstanceStub.limit.callCount).to.equal(1)],
    ['limit results to expected limit', 0, 40, () => expect(knexInstanceStub.limit.firstCall.args).to.deep.equal([40])],
    ['extract paths from results', 0, 40, (data) => expect(data).to.deep.equal(['1', '2', '3', '4', '5'])],
  ]
  tests.forEach(([title, page, limit, validationFn]) => {
    it(`should ${title}`, async () => {
      const images = await Functions.GetImages(knexFake, '/foo/bar', page, limit)
      validationFn(images)
    })
  })
})
