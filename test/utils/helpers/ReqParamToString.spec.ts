'use sanity'

import { expect } from 'chai'
import { ReqParamToString } from '../../../utils/helpers'

describe('utils/helpers function ReqParamToString()', () => {
  const tests: Array<[string | string[] | undefined, string | undefined, string]> = [
    [undefined, undefined, ''],
    [undefined, 'foobar', 'foobar'],
    ['', undefined, ''],
    ['', 'foobar', 'foobar'],
    [[], undefined, ''],
    [[], 'foobar', 'foobar'],
    [[''], undefined, ''],
    [[''], 'foobar', 'foobar'],
    [['', 'quux'], undefined, '/quux'],
    [['', 'quux'], 'foobar', '/quux'],
    [['quux', '', 'xyzzy'], undefined, 'quux//xyzzy'],
    [['quux', '', 'xyzzy'], 'foobar', 'quux//xyzzy'],
    ['quux', undefined, 'quux'],
    ['quux', 'foobar', 'quux'],
    [['quux'], undefined, 'quux'],
    [['quux'], 'foobar', 'quux'],
    [['quux', 'xyzzy'], undefined, 'quux/xyzzy'],
    [['quux', 'xyzzy'], 'foobar', 'quux/xyzzy'],
  ]
  tests.forEach(([input, defaultValue, expected]) => {
    it(`should convert \`${JSON.stringify(input)}\` with default \`${JSON.stringify(defaultValue)}\``, () => {
      expect(ReqParamToString(input, defaultValue)).to.equal(expected)
    })
  })
})
