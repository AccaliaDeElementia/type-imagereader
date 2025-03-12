'use sanity'

import { Functions } from '../../../../public/scripts/slideshow/time'
import { expect } from 'chai'
import { describe } from 'mocha'

describe('public/slideshow/time FormatDate()', () => {
  const makeDate = (year: number, month: number, day: number): Date => {
    const now = new Date()
    now.setFullYear(year)
    now.setMonth(month - 1)
    now.setDate(day)
    return now
  }
  const testCases: Array<[Date, string]> = [
    [makeDate(2025, 1, 2), 'Thursday, January 2'],
    [makeDate(2025, 2, 9), 'Sunday, February 9'],
    [makeDate(2025, 3, 12), 'Wednesday, March 12'],
    [makeDate(2025, 4, 22), 'Tuesday, April 22'],
    [makeDate(2025, 5, 12), 'Monday, May 12'],
    [makeDate(2025, 6, 13), 'Friday, June 13'],
    [makeDate(2025, 7, 19), 'Saturday, July 19'],
    [makeDate(2025, 8, 20), 'Wednesday, August 20'],
    [makeDate(2025, 9, 30), 'Tuesday, September 30'],
    [makeDate(2025, 10, 2), 'Thursday, October 2'],
    [makeDate(2025, 11, 26), 'Wednesday, November 26'],
    [makeDate(2025, 12, 8), 'Monday, December 8'],
    [makeDate(1969, 1, 1), 'Wednesday, January 1'],
    [makeDate(1969, 2, 2), 'Sunday, February 2'],
    [makeDate(1969, 3, 3), 'Monday, March 3'],
    [makeDate(1969, 4, 4), 'Friday, April 4'],
    [makeDate(1969, 5, 5), 'Monday, May 5'],
    [makeDate(1969, 6, 6), 'Friday, June 6'],
    [makeDate(1969, 7, 7), 'Monday, July 7'],
    [makeDate(1969, 8, 8), 'Friday, August 8'],
    [makeDate(1969, 9, 9), 'Tuesday, September 9'],
    [makeDate(1969, 10, 9), 'Thursday, October 9'],
    [makeDate(1969, 11, 11), 'Tuesday, November 11'],
    [makeDate(1969, 12, 13), 'Saturday, December 13'],
  ]
  testCases.forEach(([date, expected]) => {
    it(`should format ${expected} correctly`, () => {
      expect(Functions.FormatDate(date)).to.equal(expected)
    })
  })
})
