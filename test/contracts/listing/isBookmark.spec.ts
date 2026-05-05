'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { isBookmark } from '#contracts/listing.js'

describe('Contracts: isBookmark()', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['empty array', [], false],
    ['array', [{}], false],
    ['number', 4.71, false],
    ['string', 'foo!', false],
    ['empty object', {}, false],
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
  ]
  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isBookmark(obj)).to.equal(expected)
    })
  })
})
