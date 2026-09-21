'use sanity'

import { Internals } from '#public/scripts/slideshow/time.js'

const FIXED_YEAR = 2025
const FIXED_MONTH_INDEX = 0
const FIXED_DAY = 15

interface TimeCase {
  hours: number
  minutes: number
  expected: string
  boundary: string
}

const timeCases: TimeCase[] = [
  { hours: 0, minutes: 0, expected: '00:00', boundary: 'midnight pads both fields' },
  { hours: 0, minutes: 9, expected: '00:09', boundary: 'the last single-digit minute pads' },
  { hours: 7, minutes: 51, expected: '07:51', boundary: 'a single-digit hour pads beside a two-digit minute' },
  { hours: 9, minutes: 9, expected: '09:09', boundary: 'the last single-digit hour pads' },
  { hours: 10, minutes: 10, expected: '10:10', boundary: 'the first two-digit hour and minute stay unpadded' },
  { hours: 12, minutes: 0, expected: '12:00', boundary: 'noon pads only the minute' },
  { hours: 23, minutes: 59, expected: '23:59', boundary: 'the last minute of the day stays unpadded' },
]

describe('public/slideshow/time formatTime()', () => {
  timeCases.forEach(({ hours, minutes, expected, boundary }: TimeCase): void => {
    it(`should render ${expected} when ${boundary}`, () => {
      expect(Internals.formatTime(new Date(FIXED_YEAR, FIXED_MONTH_INDEX, FIXED_DAY, hours, minutes))).toBe(expected)
    })
  })
})
