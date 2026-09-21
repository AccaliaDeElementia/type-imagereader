'use sanity'

import { Internals } from '#public/scripts/slideshow/time.js'

interface DateCase {
  year: number
  month: number
  day: number
  expected: string
}

const dateCases: DateCase[] = [
  { year: 2025, month: 1, day: 2, expected: 'Thursday, January 2' },
  { year: 2025, month: 2, day: 9, expected: 'Sunday, February 9' },
  { year: 2025, month: 3, day: 12, expected: 'Wednesday, March 12' },
  { year: 2025, month: 4, day: 22, expected: 'Tuesday, April 22' },
  { year: 2025, month: 5, day: 12, expected: 'Monday, May 12' },
  { year: 2025, month: 6, day: 13, expected: 'Friday, June 13' },
  { year: 2025, month: 7, day: 19, expected: 'Saturday, July 19' },
  { year: 2025, month: 8, day: 20, expected: 'Wednesday, August 20' },
  { year: 2025, month: 9, day: 30, expected: 'Tuesday, September 30' },
  { year: 2025, month: 10, day: 2, expected: 'Thursday, October 2' },
  { year: 2025, month: 11, day: 26, expected: 'Wednesday, November 26' },
  { year: 2025, month: 12, day: 8, expected: 'Monday, December 8' },
  { year: 1969, month: 7, day: 20, expected: 'Sunday, July 20' },
]

describe('public/slideshow/time formatDate()', () => {
  dateCases.forEach(({ year, month, day, expected }: DateCase): void => {
    it(`should render ${expected} for ${year}-${month}-${day}`, () => {
      expect(Internals.formatDate(new Date(year, month - 1, day))).toBe(expected)
    })
  })
})
