'use sanity'

import { expect } from 'chai'
import { isReqWithBodyData } from '../../../routes/api'

describe('routes/api function isReqWithBodyData()', () => {
  const tests: Array<[string, unknown, boolean]> = [
    ['it should reject null object', null, false],
    ['it should reject undefined object', undefined, false],
    ['it should reject non object object', 42, false],
    ['it should reject null object body', { body: null }, false],
    ['it should reject undefined object body', { body: undefined }, false],
    ['it should reject missing object body', {}, false],
    ['it should reject null object path', { body: { path: null } }, false],
    ['it should reject undefined object path', { body: { path: undefined } }, false],
    ['it should reject missing object path', { body: {} }, false],
    ['it should reject non string object path', { body: { path: {} } }, false],
    ['it should reject non number modCount', { body: { path: '', modCount: {} } }, false],
    ['it should accept minimum object', { body: { path: '' } }, true],
    ['it should accept full object', { body: { modCount: 0, path: '' } }, true],
  ]
  tests.forEach(([title, value, expected]) => {
    it(title, () => {
      expect(isReqWithBodyData(value)).to.equal(expected)
    })
  })
})
