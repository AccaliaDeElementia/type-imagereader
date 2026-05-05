'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { isBookmarkFolder } from '#contracts/listing.js'

describe('Contracts: isBookmarkFolder()', () => {
  const bookmark = {
    name: 'foo!',
    path: 'bar!',
    folder: 'baz!',
  }
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
        path: 'foo!',
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'null name',
      {
        name: null,
        path: 'foo!',
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'undefined name',
      {
        name: undefined,
        path: 'foo!',
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'invalid name',
      {
        name: -87,
        path: 'foo!',
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'missing path',
      {
        name: 'foo!',
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'null path',
      {
        name: 'foo!',
        path: null,
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'undefined path',
      {
        name: 'foo!',
        path: undefined,
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'invalid path',
      {
        name: 'foo!',
        path: 9001,
        bookmarks: [bookmark],
      },
      false,
    ],
    [
      'missing bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
      },
      false,
    ],
    [
      'null bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: null,
      },
      false,
    ],
    [
      'undefined bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: undefined,
      },
      false,
    ],
    [
      'invalid bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: -99,
      },
      false,
    ],
    [
      'object bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: {},
      },
      false,
    ],
    [
      'invalid bookmark in array',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: [bookmark, false, bookmark],
      },
      false,
    ],
    [
      'empty bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: [],
      },
      true,
    ],
    [
      'undefined bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: Array.from({ length: 20 }).fill(bookmark),
      },
      true,
    ],
  ]

  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isBookmarkFolder(obj)).to.equal(expected)
    })
  })
})
