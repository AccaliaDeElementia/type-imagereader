'use sanity'

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { Actions } from '../../../../public/scripts/app/actions'

import { Cast } from '../../../testutils/TypeGuards'

const toHTMLElement = (o: unknown): HTMLElement | null =>
  Cast<HTMLElement | null>(o, (_): _ is HTMLElement | null => true)

describe('public/app/actions function setInnerTextMaybe', () => {
  const testCases: Array<[string, HTMLElement | null, boolean]> = [
    ['null', null, false],
    ['undefined', toHTMLElement(undefined), false],
    ['HTMLElement', toHTMLElement({ innerText: '' }), true],
  ]
  testCases.forEach(([title, obj, expected]) => {
    it(`should ${expected ? '' : 'not '} set innerText for ${title}`, () => {
      Actions.setInnerTextMaybe(obj, 'foo')
      expect(obj?.innerText).to.equal(expected ? 'foo' : undefined)
    })
  })
})
