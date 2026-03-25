'use sanity'

import { expect } from 'chai'
import { UriSafePath } from '#routes/apiFunctions'

describe('routes/apiFunctions UriSafePath functions', () => {
  const decodeTests: Array<[string, string, string]> = [
    ['empty string', '', ''],
    ['raw string', '/foo/bar', '/foo/bar'],
    ['encoded string', '/%66%6F%6F/%62%61%72', '/foo/bar'],
  ]
  decodeTests.forEach(([title, input, expected]) => {
    it(`decode() it should accept ${title}`, () => {
      expect(UriSafePath.decode(input)).to.equal(expected)
    })
  })
  const encodeNullableTests: Array<[string, string | null, string | null]> = [
    ['null string', null, null],
    ['empty string', '', null],
    ['string with encoding', '/,foo=/<bar>', '/%2Cfoo%3D/%3Cbar%3E'],
  ]
  encodeNullableTests.forEach(([title, input, expected]) => {
    it(`encodeNullable() it should accept ${title}`, () => {
      expect(UriSafePath.encodeNullable(input)).to.equal(expected)
    })
  })
  const encodeTests: Array<[string, string, string]> = [
    ['accept empty string', '', ''],
    ['accept string with encoding', '/,foo=/<bar>', '/%2Cfoo%3D/%3Cbar%3E'],
    ['not encode dot-dot path traversal segments', '../../etc/passwd', '../../etc/passwd'],
    ['encode special characters within path traversal-like segments', '../foo bar/..%2Fetc', '../foo%20bar/..%252Fetc'],
  ]
  encodeTests.forEach(([title, input, expected]) => {
    it(`encode() it should ${title}`, () => {
      expect(UriSafePath.encode(input)).to.equal(expected)
    })
  })
})
