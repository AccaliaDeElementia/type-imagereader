'use sanity'

import { expect } from 'chai'
import { isMigrationsValid } from '#utils/persistance.js'

describe('utils/persistance isMigrationsValid()', () => {
  it('should reject missing migrations element', () => {
    expect(isMigrationsValid({})).to.equal(false)
  })
  const tests: Array<[string, unknown, boolean]> = [
    ['valid migrations', { tableName: 'migrations' }, true],
    ['null migrations', null, false],
    ['undefined migrations', undefined, false],
    ['array migrations', [], false],
    ['non object migrations', 'migrations', false],
    ['null migrations.tableName', { tableName: null }, false],
    ['undefined migrations.tableName', { tableName: undefined }, false],
    ['array migrations.tableName', { tableName: [] }, false],
    ['non string migrations.tableName', { tableName: 42 }, false],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(isMigrationsValid({ migrations: input })).to.equal(expected)
    })
  })
})
