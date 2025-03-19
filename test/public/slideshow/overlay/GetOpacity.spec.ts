'use sanity'

import { describe, it } from 'mocha'
import { Functions } from '../../../../public/scripts/slideshow/overlay'
import { expect } from 'chai'

describe('public/slideshow/overlay GetOpacity()', () => {
  const testCases: Array<[number, number]> = [
    [-60000, 0],
    [-1, 0],
    [0, 0],
    [1, 0.0000010555555555555555],
    [2000, 0.002111111111111111],
    [15000, 0.01583333333333333],
    [60000, 0.06333333333333332],
    [120000, 0.12666666666666665],
    [180000, 0.19],
    [240000, 0.2533333333333333],
    [300000, 0.31666666666666665],
    [360000, 0.38],
    [420000, 0.4433333333333333],
    [480000, 0.5066666666666666],
    [540000, 0.57],
    [600000, 0.6333333333333333],
    [660000, 0.6966666666666665],
    [720000, 0.76],
    [780000, 0.8233333333333334],
    [840000, 0.8866666666666666],
    [890000, 0.9394444444444444],
    [899999, 0.9499989444444444],
    [900000, 0.95],
    [960000, 0.95],
  ]
  testCases.forEach(([input, output]) => {
    it(`should calculate opacity at ${input} as ${output}`, () => {
      const value = Functions.GetOpacity(input)
      expect(value).to.equal(output)
    })
  })
})
