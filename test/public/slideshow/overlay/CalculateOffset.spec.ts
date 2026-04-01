'use sanity'

import Sinon from 'sinon'
import { Functions } from '#public/scripts/slideshow/overlay'
import { GetAlmanac } from '#public/scripts/slideshow/weather'
import { expect } from 'chai'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/overlay CalculateDarknessMs()', () => {
  const almanac = GetAlmanac()
  beforeEach(() => {
    almanac.sunrise = new Date('2025-03-18T05:45:00.000Z').getTime()
    almanac.sunset = new Date('2025-03-18T20:45:00.000Z').getTime()
  })
  afterEach(() => {
    sandbox.restore()
  })
  const testCases: Array<[string, number]> = [
    ['2025-03-18T05:30:00.000Z', 900000],
    ['2025-03-18T05:44:00.000Z', 60000],
    ['2025-03-18T05:44:59.000Z', 1000],
    ['2025-03-18T05:45:00.000Z', 0],
    ['2025-03-18T05:46:00.000Z', 0],
    ['2025-03-18T15:45:00.000Z', 0],
    ['2025-03-18T20:45:00.000Z', 0],
    ['2025-03-18T20:44:00.000Z', 0],
    ['2025-03-18T20:44:59.000Z', 0],
    ['2025-03-18T20:45:01.000Z', 1000],
    ['2025-03-18T20:46:00.000Z', 60000],
    ['2025-03-18T21:00:00.000Z', 900000],
  ]
  testCases.forEach(([timeNow, expected]) => {
    it(`should calculate correct offset for ${timeNow}`, () => {
      sandbox.useFakeTimers({
        now: new Date(timeNow).getTime(),
      })
      expect(Functions.CalculateDarknessMs()).to.equal(expected)
    })
  })
})
