'use sanity'

import { expect } from 'chai'
import { TypeGuards } from '../../../utils/persistance'

describe('utils/persistance function isMigrationsValid()', () => {
  it('should reject missing migrations element', () => {
    expect(TypeGuards.isMigrationsValid({})).to.equal(false)
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
      expect(TypeGuards.isMigrationsValid({ migrations: input })).to.equal(expected)
    })
  })
})
