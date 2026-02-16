'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { isListing } from '../../../contracts/listing'

describe('Contracts: isListing()', () => {
  const namePathParent = (name: unknown, path: unknown, parent: unknown): unknown => ({
    name,
    path,
    parent,
  })
  const oneField = (name: string, theValue: unknown): unknown => {
    const a: Record<string, unknown> = { name: 'foo!', path: 'bar!', parent: 'baz!' }
    a[name] = theValue
    return a
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
        path: 'bar!',
        parent: 'baz!',
      },
      false,
    ],
    ['null name', namePathParent(null, 'bar!', 'baz!'), false],
    ['undefined name', namePathParent(undefined, 'bar!', 'baz!'), false],
    ['invalid name', namePathParent(17, 'bar!', 'baz!'), false],
    [
      'missing path',
      {
        name: 'foo!',
        parent: 'baz!',
      },
      false,
    ],
    ['null path', namePathParent('foo!', null, 'baz!'), false],
    ['undefined path', namePathParent('foo!', undefined, 'baz!'), false],
    ['invalid path', namePathParent('foo!', true, 'baz!'), false],
    [
      'missing parent',
      {
        name: 'foo!',
        path: 'bar!',
      },
      false,
    ],
    ['null parent', namePathParent('foo!', 'bar!', null), false],
    ['undefined parent', namePathParent('foo!', 'bar!', undefined), false],
    ['invalid parent', namePathParent('foo!', 'bar!', []), false],
    [
      'minimum valid',
      {
        name: 'foo!',
        path: 'bar!',
        parent: 'baz!',
      },
      true,
    ],
    ['null cover', oneField('cover', null), true],
    ['undefined cover', oneField('cover', undefined), true],
    ['invalid cover', oneField('cover', {}), false],
    ['valid cover', oneField('cover', 'quux!'), true],
    ['null modCount', oneField('modCount', null), false],
    ['undefined modCount', oneField('modCount', undefined), true],
    ['invalid modCount', oneField('modCount', '15'), false],
    ['valid modCount', oneField('modCount', 99), true],
    ['null noMenu', oneField('noMenu', null), false],
    ['undefined name', oneField('noMenu', undefined), true],
    ['invalid noMenu', oneField('noMenu', 'no menu~!'), false],
    ['valid noMenu', oneField('noMenu', true), true],
    ['null next', oneField('next', null), true],
    ['undefined next', oneField('next', undefined), true],
    ['invalid next', oneField('next', {}), false],
    ['valid next', oneField('next', { name: '', path: '', cover: null }), true],
    ['null nextUnread', oneField('nextUnread', null), true],
    ['undefined nextUnread', oneField('nextUnread', undefined), true],
    ['invalid nextUnread', oneField('nextUnread', {}), false],
    ['valid nextUnread', oneField('nextUnread', { name: '', path: '', cover: null }), true],
    ['null prev', oneField('prev', null), true],
    ['undefined prev', oneField('prev', undefined), true],
    ['invalid prev', oneField('prev', {}), false],
    ['valid prev', oneField('prev', { name: '', path: '', cover: null }), true],
    ['null prevUnread', oneField('prevUnread', null), true],
    ['undefined prevUnread', oneField('prevUnread', undefined), true],
    ['invalid prevUnread', oneField('prevUnread', {}), false],
    ['valid prevUnread', oneField('prevUnread', { name: '', path: '', cover: null }), true],
    ['null children', oneField('children', null), false],
    ['undefined children', oneField('children', undefined), true],
    ['invalid children', oneField('children', {}), false],
    ['empty children', oneField('children', []), true],
    ['invalid child in children', oneField('children', [89]), false],
    [
      'non empty children',
      oneField('children', [{ name: '', path: '', cover: '', totalSeen: 0, totalCount: 1 }]),
      true,
    ],
    ['invalid pictures', oneField('pictures', {}), false],
    ['undefined pictures', oneField('pictures', undefined), true],
    ['empty pictures', oneField('pictures', []), true],
    ['invalid picture in pictures', oneField('pictures', ['picture']), false],
    ['non empty pictures', oneField('pictures', [{ name: '', path: '', seen: true }]), true],
    ['null bookmarks', oneField('bookmarks', null), false],
    ['undefined bookmarks', oneField('bookmarks', undefined), true],
    ['empty bookmarks', oneField('bookmarks', []), true],
    ['invalid bookmark in  bookmarks', oneField('bookmarks', [{}]), false],
    ['non empty bookmarks', oneField('bookmarks', [{ name: 'foo!', path: 'bar!', bookmarks: [] }]), true],
  ]
  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isListing(obj)).to.equal(expected)
    })
  })
})
