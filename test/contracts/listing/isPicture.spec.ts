'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { isPicture } from '#contracts/listing.js'

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
