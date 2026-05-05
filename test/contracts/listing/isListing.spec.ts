'use sanity'

import { expect } from 'chai'
import { isListing } from '#contracts/listing.js'

describe('Contracts: isListing()', () => {
  const threeValueObject = (name: unknown, path: unknown, parent: unknown): unknown => ({
    name,
    path,
    parent,
  })
  const oneExtraKey = (name: string, value: unknown): unknown => {
    const res: Record<string, unknown> = { name: 'foo!', path: 'bar!', parent: 'baz!' }
    res[name] = value
    return res
  }
  const cases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['empty array', [], false],
    ['array', [{}], false],
    ['number', 4.71, false],
    ['string', 'foo!', false],
    ['empty object', {}, false],
    ['missing name', { path: 'bar!', parent: 'baz!' }, false],
    ['null name', threeValueObject(null, 'bar!', 'baz!'), false],
    ['undefined name', threeValueObject(undefined, 'bar!', 'baz!'), false],
    ['invalid name', threeValueObject(17, 'bar!', 'baz!'), false],
    ['missing path', { name: 'foo!', parent: 'baz!' }, false],
    ['null path', threeValueObject('foo!', null, 'baz!'), false],
    ['undefined path', threeValueObject('foo!', undefined, 'baz!'), false],
    ['invalid path', threeValueObject('foo!', true, 'baz!'), false],
    ['missing parent', { name: 'foo!', path: 'bar!' }, false],
    ['null parent', threeValueObject('foo!', 'bar!', null), false],
    ['undefined parent', threeValueObject('foo!', 'bar!', undefined), false],
    ['invalid parent', threeValueObject('foo!', 'bar!', []), false],
    ['minimum valid', threeValueObject('foo!', 'bar!', 'baz!'), true],
    ['null cover', oneExtraKey('cover', null), true],
    ['undefined cover', oneExtraKey('cover', undefined), true],
    ['invalid cover', oneExtraKey('cover', {}), false],
    ['valid cover', oneExtraKey('cover', 'quux!'), true],
    ['null modCount', oneExtraKey('modCount', null), false],
    ['undefined modCount', oneExtraKey('modCount', undefined), true],
    ['invalid modCount', oneExtraKey('modCount', '15'), false],
    ['valid modCount', oneExtraKey('modCount', 99), true],
    ['null noMenu', oneExtraKey('noMenu', null), false],
    ['undefined name', oneExtraKey('noMenu', undefined), true],
    ['invalid noMenu', oneExtraKey('noMenu', 'no menu~!'), false],
    ['valid noMenu', oneExtraKey('noMenu', true), true],
    ['null next', oneExtraKey('next', null), true],
    ['undefined next', oneExtraKey('next', undefined), true],
    ['invalid next', oneExtraKey('next', {}), false],
    ['valid next', oneExtraKey('next', { name: '', path: '', cover: null }), true],
    ['null nextUnread', oneExtraKey('nextUnread', null), true],
    ['undefined nextUnread', oneExtraKey('nextUnread', undefined), true],
    ['invalid nextUnread', oneExtraKey('nextUnread', {}), false],
    ['valid nextUnread', oneExtraKey('nextUnread', { name: '', path: '', cover: null }), true],
    ['null prev', oneExtraKey('prev', null), true],
    ['undefined prev', oneExtraKey('prev', undefined), true],
    ['invalid prev', oneExtraKey('prev', {}), false],
    ['valid prev', oneExtraKey('prev', { name: '', path: '', cover: null }), true],
    ['null prevUnread', oneExtraKey('prevUnread', null), true],
    ['undefined prevUnread', oneExtraKey('prevUnread', undefined), true],
    ['invalid prevUnread', oneExtraKey('prevUnread', {}), false],
    ['valid prevUnread', oneExtraKey('prevUnread', { name: '', path: '', cover: null }), true],
    ['null children', oneExtraKey('children', null), false],
    ['undefined children', oneExtraKey('children', undefined), true],
    ['invalid children', oneExtraKey('children', {}), false],
    ['empty children', oneExtraKey('children', []), true],
    ['invalid child in children', oneExtraKey('children', [89]), false],
    [
      'non empty children',
      oneExtraKey('children', [{ name: '', path: '', cover: '', seenCount: 0, totalCount: 1 }]),
      true,
    ],
    ['invalid pictures', oneExtraKey('pictures', {}), false],
    ['undefined pictures', oneExtraKey('pictures', undefined), true],
    ['empty pictures', oneExtraKey('pictures', []), true],
    ['invalid picture in pictures', oneExtraKey('pictures', ['picture']), false],
    ['non empty pictures', oneExtraKey('pictures', [{ name: '', path: '', seen: true }]), true],
    ['null bookmarks', oneExtraKey('bookmarks', null), false],
    ['undefined bookmarks', oneExtraKey('bookmarks', undefined), true],
    ['empty bookmarks', oneExtraKey('bookmarks', []), true],
    ['invalid bookmark in  bookmarks', oneExtraKey('bookmarks', [{}]), false],
    ['non empty bookmarks', oneExtraKey('bookmarks', [{ name: 'foo!', path: 'bar!', bookmarks: [] }]), true],
  ]
  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isListing(obj)).to.equal(expected)
    })
  })
})
