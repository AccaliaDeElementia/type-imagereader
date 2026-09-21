'use sanity'

import { requirePresent } from '#testutils/preconditions.js'

interface PresentValue {
  label: string
  value: unknown
}

const presentValues: PresentValue[] = [
  { label: 'zero', value: 0 },
  { label: 'the empty string', value: '' },
  { label: 'false', value: false },
  { label: 'NaN', value: Number.NaN },
  { label: 'an object', value: { a: 1 } },
]

interface AbsentValue {
  label: string
  value: null | undefined
}

const absentValues: AbsentValue[] = [
  { label: 'null', value: null },
  { label: 'undefined', value: undefined },
]

describe('testutils/preconditions requirePresent()', () => {
  presentValues.forEach(({ label, value }: PresentValue): void => {
    it(`should accept ${label} because it is present`, () => {
      expect(() => {
        requirePresent(value, 'the subject')
      }).not.toThrow()
    })
  })
  absentValues.forEach(({ label, value }: AbsentValue): void => {
    it(`should throw naming the subject and ${label}`, () => {
      expect(() => {
        requirePresent(value, 'the subject')
      }).toThrow(`test precondition failed: the subject was ${label}`)
    })
  })
})
