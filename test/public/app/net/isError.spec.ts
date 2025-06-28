'use sanity'

import { expect } from 'chai'
import { isError } from '../../../../public/scripts/app/net'

describe('public/app/net function isError()', () => {
  const testCases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['number', 72, false],
    ['boolean false', false, false],
    ['boolean true', true, false],
    ['empty array', [], false],
    ['array', [1, 4, 99], false],
    ['empty object', {}, false],
    ['listing', { name: 'foo', path: '/foo', parent: '/' }, false],
    ['base error', { error: 'foo' }, true],
    ['object with non string error node', { error: true }, false],
  ]
  testCases.forEach(([name, data, expected]) => {
    it(`should${expected ? '' : ' not'} consider ${name} to be an error`, () => {
      expect(isError(data)).to.equal(expected)
    })
  })
})
