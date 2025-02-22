import { expect } from 'chai'
import { describe, it } from 'mocha'
import { isNavigateData } from '../../../../public/scripts/app/actions'

describe('App Actions isNavigateData() Tests', () => {
  const acceptTests: Record<string, unknown> = {
    'empty object': {},
    'object with children array': {
      children: [1, 2, 3],
    },
    'object with undefined children': {
      children: undefined,
    },
    'object with pictures array': {
      pictures: [1, 2, 3],
    },
    'object with undefined pictures': {
      pictures: undefined,
    },
  }
  Object.entries(acceptTests).forEach(([key, obj]) => {
    it(`should accept ${key}`, () => {
      expect(isNavigateData(obj)).to.equal(true)
    })
  })

  const rejectTests: Record<string, unknown> = {
    'null object': null,
    'undefined object': undefined,
    'number object': 42,
    'boolean object': true,
    'string object': '',
    'object with null children': {
      children: null,
    },
    'object with null pictures': {
      pictures: null,
    },
  }
  Object.entries(rejectTests).forEach(([key, obj]) => {
    it(`should reject ${key}`, () => {
      expect(isNavigateData(obj)).to.equal(false)
    })
  })
})
