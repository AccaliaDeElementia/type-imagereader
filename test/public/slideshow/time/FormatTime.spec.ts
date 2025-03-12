'use sanity'

import { Functions } from '../../../../public/scripts/slideshow/time'
import { expect } from 'chai'
import { describe } from 'mocha'

describe('public/slideshow/time FormatTime()', () => {
  const makeTime = (hours: number, minutes: number): Date => {
    const now = new Date()
    now.setHours(hours)
    now.setMinutes(minutes)
    return now
  }
  const testCases: Array<[Date, string]> = [
    [makeTime(0, 1), '00:01'],
    [makeTime(1, 2), '01:02'],
    [makeTime(2, 6), '02:06'],
    [makeTime(3, 7), '03:07'],
    [makeTime(4, 20), '04:20'],
    [makeTime(5, 13), '05:13'],
    [makeTime(6, 0), '06:00'],
    [makeTime(7, 51), '07:51'],
    [makeTime(8, 45), '08:45'],
    [makeTime(9, 19), '09:19'],
    [makeTime(10, 1), '10:01'],
    [makeTime(11, 7), '11:07'],
    [makeTime(12, 40), '12:40'],
    [makeTime(13, 4), '13:04'],
    [makeTime(14, 10), '14:10'],
    [makeTime(15, 21), '15:21'],
    [makeTime(16, 32), '16:32'],
    [makeTime(17, 43), '17:43'],
    [makeTime(18, 54), '18:54'],
    [makeTime(19, 5), '19:05'],
    [makeTime(20, 16), '20:16'],
    [makeTime(21, 27), '21:27'],
    [makeTime(22, 36), '22:36'],
    [makeTime(23, 47), '23:47'],
    [makeTime(1, 5), '01:05'],
    [makeTime(1, 32), '01:32'],
    [makeTime(11, 5), '11:05'],
    [makeTime(13, 5), '13:05'],
    [makeTime(23, 49), '23:49'],
  ]
  testCases.forEach(([time, expected]) => {
    it(`should format ${expected} correctly`, () => {
      expect(Functions.FormatTime(time)).to.equal(expected)
    })
  })
})
