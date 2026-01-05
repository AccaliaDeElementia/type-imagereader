'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'
import { expect } from 'chai'
import { Functions } from '../../../routes/slideshow'

describe('routes/slideshow function GetUnreadImageCount()', () => {
  let knexInstanceStub = {
    count: Sinon.stub().returnsThis(),
    where: Sinon.stub().returnsThis(),
    andWhere: Sinon.stub().resolves(),
  }
  let knexStub = Sinon.stub().returns(knexInstanceStub)
  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexInstanceStub = {
      count: Sinon.stub().returnsThis(),
      where: Sinon.stub().returnsThis(),
      andWhere: Sinon.stub().resolves([]),
    }
    knexStub = Sinon.stub().returns(knexInstanceStub)
    knexFake = StubToKnex(knexStub)
  })
  const queryTests: Array<[string, () => void]> = [
    ['query knex once', () => expect(knexStub.callCount).to.equal(1)],
    ['query pictures folder', () => expect(knexStub.firstCall.args).to.deep.equal(['pictures'])],
    ['count result rows', () => expect(knexInstanceStub.count.callCount).to.equal(1)],
    [
      'count results by path column',
      () => expect(knexInstanceStub.count.firstCall.args).to.deep.equal([{ count: 'path' }]),
    ],
    ['filter results with where clause', () => expect(knexInstanceStub.where.callCount).to.equal(1)],
    [
      'filter results on paths prefixed with parameter',
      () => expect(knexInstanceStub.where.firstCall.args).to.deep.equal(['path', 'like', '/slideshow/path%']),
    ],
    ['additionally filter results with andWhere()', () => expect(knexInstanceStub.andWhere.callCount).to.equal(1)],
    [
      'filter results on only unseen',
      () => expect(knexInstanceStub.andWhere.firstCall.args).to.deep.equal(['seen', '=', false]),
    ],
  ]
  queryTests.forEach(([title, validationFn]) => {
    it(`should ${title}`, async () => {
      await Functions.GetUnreadImageCount(knexFake, '/slideshow/path')
      validationFn()
    })
  })
  const resultsTests: Array<[string, unknown, number]> = [
    ['default value for no results', [], 0],
    ['default value for undefined results', undefined, 0],
    ['default value for null results', null, 0],
    ['default value for undefined results row', [undefined], 0],
    ['default value for null results row', [null], 0],
    ['default value for number results', [42], 0],
    ['default value for missing key results', [{}], 0],
    ['default value for undefined results key', [{ count: undefined }], 0],
    ['default value for null results key', [{ count: null }], 0],
    ['first result only', [{ count: 72 }, { count: 89 }], 72],
    ['number results ', [{ count: 12 }], 12],
    ['string results ', [{ count: '24' }], 24],
  ]
  resultsTests.forEach(([title, result, expected]) => {
    it(`should resolve ${title}`, async () => {
      knexInstanceStub.andWhere.resolves(result)
      const actual = await Functions.GetUnreadImageCount(knexFake, '/foo')
      expect(actual).to.equal(expected)
    })
  })
})
