'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import {
  isBookmark,
  isBookmarkFolder,
  isFolder,
  isFolderWithCounts,
  isListing,
  isPicture,
} from '../../contracts/listing'

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
      'object patj',
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
      'missing bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
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
      'null bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        bookmarks: null,
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

describe('Contracts: isPicture()', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['empty array', [], false],
    ['array', [{}], false],
    ['number', 4.71, false],
    ['string', 'foo!', false],
    ['empty object', {}, false],
    [
      'null path',
      {
        path: null,
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'undefined path',
      {
        path: undefined,
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'missing path',
      {
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'invalid path',
      {
        path: {},
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'null name',
      {
        path: 'foo!',
        name: null,
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'undefined name',
      {
        path: 'foo!',
        name: undefined,
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'missing name',
      {
        path: 'foo!',
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'invalid name',
      {
        path: 'foo!',
        name: 534,
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'null seen',
      {
        path: 'foo!',
        name: 'bar!',
        seen: null,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'undefined seen',
      {
        path: 'foo!',
        name: 'bar!',
        seen: undefined,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'missing seen',
      {
        path: 'foo!',
        name: '',
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'invalid seen',
      {
        path: 'foo!',
        name: 'bar!',
        seen: 'false',
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'missing index',
      {
        path: 'foo!',
        name: '',
        seen: false,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      true,
    ],
    [
      'null index',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: null,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'undefined index',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: undefined,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      true,
    ],
    [
      'invalid index',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: [],
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'missing page',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      true,
    ],
    [
      'null page',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: null,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'undefined page',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: undefined,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      true,
    ],
    [
      'invalid page',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: 'one',
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      false,
    ],
    [
      'missing element',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: 0,
      },
      true,
    ],
    [
      'null element',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: null,
      },
      false,
    ],
    [
      'undefined element',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: undefined,
      },
      true,
    ],
    [
      'invalid element',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: {},
      },
      false,
    ],
    [
      'valid API Picture',
      {
        path: 'foo!',
        name: '',
        seen: false,
      },
      true,
    ],
    [
      'valid web Picture',
      {
        path: 'foo!',
        name: '',
        seen: false,
        index: 0,
        page: 0,
        element: {
          style: '', // a "fake" HTMLElement
        },
      },
      true,
    ],
  ]
  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isPicture(obj)).to.equal(expected)
    })
  })
})

describe('Contracts: isListing()', () => {
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
        parent: 'baz!',
      },
      false,
    ],
    [
      'null name',
      {
        name: null,
        path: 'bar!',
        parent: 'baz!',
      },
      false,
    ],
    [
      'undefined name',
      {
        name: undefined,
        path: 'bar!',
        parent: 'baz!',
      },
      false,
    ],
    [
      'invalid name',
      {
        name: 17,
        path: 'bar!',
        parent: 'baz!',
      },
      false,
    ],
    [
      'missing path',
      {
        name: 'foo!',
        parent: 'baz!',
      },
      false,
    ],
    [
      'null path',
      {
        name: 'foo!',
        path: null,
        parent: 'baz!',
      },
      false,
    ],
    [
      'undefined path',
      {
        name: 'foo!',
        path: undefined,
        parent: 'baz!',
      },
      false,
    ],
    [
      'invalid path',
      {
        name: 'foo!',
        path: true,
        parent: 'baz!',
      },
      false,
    ],
    [
      'missing parent',
      {
        name: 'foo!',
        path: 'bar!',
      },
      false,
    ],
    [
      'null parent',
      {
        name: 'foo!',
        path: 'bar!',
        parent: null,
      },
      false,
    ],
    [
      'undefined parent',
      {
        name: 'foo!',
        path: 'bar!',
        parent: undefined,
      },
      false,
    ],
    [
      'invalid parent',
      {
        name: 'foo!',
        path: 'bar!',
        parent: [],
      },
      false,
    ],
    [
      'minimum valid',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
      },
      true,
    ],
    [
      'null cover',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        cover: null,
      },
      false,
    ],
    [
      'undefined cover',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        cover: undefined,
      },
      true,
    ],
    [
      'invalid cover',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        cover: {},
      },
      false,
    ],
    [
      'valid cover',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        cover: 'quux!',
      },
      true,
    ],
    [
      'null modCount',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        modCount: null,
      },
      false,
    ],
    [
      'undefined modCount',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        modCount: undefined,
      },
      true,
    ],
    [
      'invalid modCount',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        modCount: '15',
      },
      false,
    ],
    [
      'valid modCount',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        modCount: 99,
      },
      true,
    ],
    [
      'null noMenu',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        noMenu: null,
      },
      false,
    ],
    [
      'undefined name',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        noMenu: undefined,
      },
      true,
    ],
    [
      'invalid noMenu',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        noMenu: 'no menu~!',
      },
      false,
    ],
    [
      'valid noMenu',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        noMenu: true,
      },
      true,
    ],
    [
      'null next',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        next: null,
      },
      false,
    ],
    [
      'undefined next',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        next: undefined,
      },
      true,
    ],
    [
      'invalid next',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        next: {},
      },
      false,
    ],
    [
      'valid next',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        next: { name: '', path: '', cover: null },
      },
      true,
    ],
    [
      'null nextUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        nextUnread: null,
      },
      false,
    ],
    [
      'undefined nextUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        nextUnread: undefined,
      },
      true,
    ],
    [
      'invalid nextUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        nextUnread: {},
      },
      false,
    ],
    [
      'valid nextUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        nextUnread: { name: '', path: '', cover: null },
      },
      true,
    ],
    [
      'null prev',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prev: null,
      },
      false,
    ],
    [
      'undefined prev',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prev: undefined,
      },
      true,
    ],
    [
      'invalid prev',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prev: {},
      },
      false,
    ],
    [
      'valid prev',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prev: { name: '', path: '', cover: null },
      },
      true,
    ],
    [
      'null prevUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prevUnread: null,
      },
      false,
    ],
    [
      'undefined prevUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prevUnread: undefined,
      },
      true,
    ],
    [
      'invalid prevUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prevUnread: {},
      },
      false,
    ],
    [
      'valid prevUnread',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        prevUnread: { name: '', path: '', cover: null },
      },
      true,
    ],
    [
      'null children',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        children: null,
      },
      false,
    ],
    [
      'undefined children',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        children: undefined,
      },
      true,
    ],
    [
      'invalid children',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        children: {},
      },
      false,
    ],
    [
      'empty children',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        children: [],
      },
      true,
    ],
    [
      'invalid child in children',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        children: [89],
      },
      false,
    ],
    [
      'non empty children',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        children: [{ name: '', path: '', cover: '', totalSeen: 0, totalCount: 1 }],
      },
      true,
    ],
    [
      'invalid pictures',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        pictures: {},
      },
      false,
    ],
    [
      'undefined pictures',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        pictures: undefined,
      },
      true,
    ],
    [
      'empty pictures',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        pictures: [],
      },
      true,
    ],
    [
      'invalid picture in pictures',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        pictures: ['picture'],
      },
      false,
    ],
    [
      'non empty pictures',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        pictures: [{ name: '', path: '', seen: true }],
      },
      true,
    ],
    [
      'null bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        bookmarks: null,
      },
      false,
    ],
    [
      'undefined bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        bookmarks: undefined,
      },
      true,
    ],
    [
      'empty bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        bookmarks: [],
      },
      true,
    ],
    [
      'invalid bookmark in  bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        bookmarks: [{}],
      },
      false,
    ],

    [
      'non empty bookmarks',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
        bookmarks: [{ name: 'foo!', path: 'bar!', bookmarks: [] }],
      },
      true,
    ],
  ]
  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isListing(obj)).to.equal(expected)
    })
  })
})
