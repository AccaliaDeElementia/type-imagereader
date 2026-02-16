'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { isFolder, isFolderWithCounts } from '../../../contracts/listing'

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
        totalSeen: 0,
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
        totalSeen: 0,
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
        totalSeen: 0,
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
        totalSeen: 0,
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
        totalSeen: 0,
      },
      true,
    ],
    [
      'missing totalSeen',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
      },
      false,
    ],
    [
      'undefined totalSeen',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        totalSeen: undefined,
      },
      false,
    ],
    [
      'null totalSeen',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        totalSeen: null,
      },
      false,
    ],
    [
      'invalid totalSeen',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        totalSeen: 'Seventeen',
      },
      false,
    ],
    [
      'negative totalSeen',
      {
        name: 'foo!',
        path: 'bar!',
        cover: 'baz!',
        totalCount: 0,
        totalSeen: -9999,
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
        totalSeen: 7,
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
