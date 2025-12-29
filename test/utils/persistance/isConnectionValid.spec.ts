'use sanity'

import { expect } from 'chai'
import { TypeGuards } from '../../../utils/persistance'

describe('utils/persistance function isConnectionValid()', () => {
  it('should reject missing connection element', () => {
    expect(TypeGuards.isConnectionValid({})).to.equal(false)
  })
  const tests: Array<[string, unknown, boolean]> = [
    [
      'valid complete connection',
      { host: 'host', database: 'database', user: 'user', password: 'password', filename: 'filename' },
      true,
    ],
    ['null connection element', null, false],
    ['undefined connection element', undefined, false],
    ['array connection element', [], false],
    ['non object connection element', 'connection', false],
    [
      'missing connection.host element',
      { database: 'database', user: 'user', password: 'password', filename: 'filename' },
      true,
    ],
    [
      'missing connection.database element',
      { host: 'host', user: 'user', password: 'password', filename: 'filename' },
      true,
    ],
    [
      'missing connection.user element',
      { host: 'host', database: 'database', password: 'password', filename: 'filename' },
      true,
    ],
    [
      'missing connection.password element',
      { host: 'host', database: 'database', user: 'user', filename: 'filename' },
      true,
    ],
    [
      'missing connection.filename element',
      { host: 'host', database: 'database', user: 'user', password: 'password', filename: 'filename' },
      true,
    ],
    ['undefined connection.host element', { host: undefined }, false],
    ['undefined connection.database element', { database: undefined }, false],
    ['undefined connection.user element', { user: undefined }, false],
    ['undefined connection.password element', { password: undefined }, false],
    ['undefined connection.filename element', { filename: undefined }, false],
    ['null connection.host element', { host: null }, false],
    ['null connection.database element', { database: null }, false],
    ['null connection.user element', { user: null }, false],
    ['null connection.password element', { password: null }, false],
    ['null connection.filename element', { filename: null }, false],
    ['non string connection.host element', { host: 42 }, false],
    ['non string connection.database element', { database: 42 }, false],
    ['non-string connection.user element', { user: 42 }, false],
    ['non-string connection.password element', { password: 42 }, false],
    ['non-string connection.filename element', { filename: 42 }, false],
    ['string connection.host element', { host: '42' }, true],
    ['string connection.database element', { database: '42' }, true],
    ['string connection.user element', { user: '42' }, true],
    ['string connection.password element', { password: '42' }, true],
    ['string connection.filename element', { filename: '42' }, true],
    ['unexpected connection element', { foobar: '42' }, true],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(TypeGuards.isConnectionValid({ connection: input })).to.equal(expected)
    })
  })
})
