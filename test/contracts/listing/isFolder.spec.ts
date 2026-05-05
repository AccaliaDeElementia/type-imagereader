'use sanity'

import { expect } from 'chai'
import { isFolder, isFolderWithCounts } from '#contracts/listing.js'

describe('Contracts: isFolder(), isFolderWithCounts()', () => {
  const commonCases: Array<[string, unknown, boolean]> = [
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
        cover: 'bar!',
      },
      false,
    ],
    [
      'undefined name',
      {
        name: undefined,
        path: 'foo!',
        cover: 'bar!',
      },
      false,
    ],
    [
      'null name',
      {
        name: null,
        path: 'foo!',
        cover: 'bar!',
      },
      false,
    ],
    [
      'invalid name',
      {
        name: 69.42,
        path: 'foo!',
        cover: 'bar!',
      },
      false,
    ],
    [
      'missing path',
      {
        name: 'foo!',
        cover: 'bar!',
      },
      false,
    ],
    [
      'null path',
      {
        name: 'foo!',
        path: null,
        cover: 'bar!',
      },
      false,
    ],
    [
      'undefined path',
      {
        name: 'foo!',
        path: undefined,
        cover: 'bar!',
      },
      false,
    ],
    [
      'invalid path',
      {
        name: 'foo!',
        path: false,
        cover: 'bar!',
      },
      false,
    ],
    [
      'missing cover',
      {
        name: 'foo!',
        path: 'bar!',
      },
      false,
    ],
    [
      'undefined cover',
      {
        name: 'foo!',
        path: 'bar!',
        cover: undefined,
      },
      false,
    ],
    [
      'invalid cover',
      {
        name: 'foo!',
        path: 'bar!',
        cover: {},
      },
      false,
    ],
  ]
  const foldersTests: Array<[string, unknown, boolean]> = [
    [
      'null cover',
      {
        name: 'foo!',
        path: 'bar!',
        cover: null,
      },
      true,
    ],
    [
      'empty name',
      {
        name: '',
        path: 'bar!',
        cover: 'foo!',
      },
      true,
    ],
    [
      'empty path',
      {
        name: 'foo!',
        path: '',
        cover: 'bar!',
      },
      true,
    ],
    [
      'empty cover',
      {
        name: 'foo!',
        path: 'bar!',
        cover: '',
      },
      true,
    ],
  ]
  const foldersWithCountsTests: Array<[string, unknown, boolean]> = [
    ['invalid folder', {}, false],
    [
      'missing totalCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        seenCount: 0,
      },
      false,
    ],
    [
      'undefined totalCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: undefined,
        seenCount: 0,
      },
      false,
    ],
    [
      'null totalCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: null,
        seenCount: 0,
      },
      false,
    ],
    [
      'invalid totalCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: {},
        seenCount: 0,
      },
      false,
    ],
    [
      'negative totalCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: -17,
        seenCount: 0,
      },
      true,
    ],
    [
      'missing seenCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
      },
      false,
    ],
    [
      'undefined seenCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        seenCount: undefined,
      },
      false,
    ],
    [
      'null seenCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        seenCount: null,
      },
      false,
    ],
    [
      'invalid seenCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        seenCount: 'Seventeen',
      },
      false,
    ],
    [
      'negative seenCount',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        seenCount: -9999,
      },
      true,
    ],
    [
      'valid FolderWithCounts',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 7,
        seenCount: 7,
      },
      true,
    ],
  ]

  commonCases.concat(foldersTests).forEach(([title, obj, expected]) => {
    it(`isFolder() should return ${expected} for ${title}`, () => {
      expect(isFolder(obj)).to.equal(expected)
    })
  })
  commonCases.concat(foldersWithCountsTests).forEach(([title, obj, expected]) => {
    it(`isFolderWithCounts() should return ${expected} for ${title}`, () => {
      expect(isFolderWithCounts(obj)).to.equal(expected)
    })
  })
})
