'use sanity'

import { escapeLikeWildcards } from '#utils/helpers.js'

describe('utils/helpers escapeLikeWildcards()', () => {
  const tests: Array<[string, string, string]> = [
    ['plain string', '/foo/bar/', '/foo/bar/'],
    ['percent sign', '/foo%/bar/', '/foo\\%/bar/'],
    ['underscore', '/foo_bar/', '/foo\\_bar/'],
    ['backslash', '/foo\\/bar/', '/foo\\\\/bar/'],
    ['multiple percent signs', '/fo%o%/', '/fo\\%o\\%/'],
    ['multiple underscores', '/f_o_o/', '/f\\_o\\_o/'],
    ['percent and underscore', '/%_/', '/\\%\\_/'],
    ['backslash before percent', '/foo\\%/', '/foo\\\\\\%/'],
    ['empty string', '', ''],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should escape ${title}`, () => {
      expect(escapeLikeWildcards(input)).toBe(expected)
    })
  })
})
