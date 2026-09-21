'use sanity'

import { isBookmark } from '#contracts/listing.js'
import { REJECTED_BY_ALL_LISTING_GUARDS, type ListingGuardCase } from '#testutils/listingGuardCases.js'

describe('Contracts: isBookmark()', () => {
  const cases: ListingGuardCase[] = REJECTED_BY_ALL_LISTING_GUARDS.concat([
    ['array carrying every bookmark field', Object.assign([], { name: 'foo!', path: 'bar!', folder: 'baz!' }), false],
    [
      'missing name',
      {
        path: 'bar!',
        folder: 'baz!',
      },
      false,
    ],
    [
      'invalid name',
      {
        name: 3.14159,
        path: 'bar!',
        folder: 'baz!',
      },
      false,
    ],
    [
      'null name',
      {
        name: null,
        path: 'bar!',
        folder: 'baz!',
      },
      false,
    ],
    [
      'undefined name',
      {
        name: undefined,
        path: 'bar!',
        folder: 'baz!',
      },
      false,
    ],
    [
      'object name',
      {
        name: {},
        path: 'bar!',
        folder: 'baz!',
      },
      false,
    ],
    [
      'array name',
      {
        name: [],
        path: 'bar!',
        folder: 'baz!',
      },
      false,
    ],
    [
      'missing path',
      {
        name: 'foo!',
        folder: 'baz!',
      },
      false,
    ],
    [
      'invalid path',
      {
        name: 'foo!',
        path: -73,
        folder: 'baz!',
      },
      false,
    ],
    [
      'null path',
      {
        name: 'foo!',
        path: null,
        folder: 'baz!',
      },
      false,
    ],
    [
      'undefined path',
      {
        name: 'foo!',
        path: undefined,
        folder: 'baz!',
      },
      false,
    ],
    [
      'object path',
      {
        name: 'foo!',
        path: {},
        folder: 'baz!',
      },
      false,
    ],
    [
      'array path',
      {
        name: 'foo!',
        path: [],
        folder: 'baz!',
      },
      false,
    ],
    [
      'missing name',
      {
        name: 'foo!',
        path: 'bar!',
      },
      false,
    ],
    [
      'invalid folder',
      {
        name: 'foo!',
        path: 'bar!',
        folder: Number.NaN,
      },
      false,
    ],
    [
      'null folder',
      {
        name: 'foo!',
        path: 'bar!',
        folder: null,
      },
      false,
    ],
    [
      'undefined folder',
      {
        name: 'foo!',
        path: 'bar!',
        folder: undefined,
      },
      false,
    ],
    [
      'object folder',
      {
        name: 'foo!',
        path: 'bar!',
        folder: {},
      },
      false,
    ],
    [
      'array folder',
      {
        name: 'foo!',
        path: 'bar!',
        folder: [],
      },
      false,
    ],
    [
      'valid bookmark',
      {
        name: 'foo!',
        path: 'bar!',
        folder: 'baz!',
      },
      true,
    ],
  ])
  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isBookmark(obj)).toBe(expected)
    })
  })
})
