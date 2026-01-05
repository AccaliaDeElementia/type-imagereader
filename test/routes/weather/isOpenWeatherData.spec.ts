'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/weather'

describe('routes/weather function isOpenWeatherData', () => {
  const minMain = { temp: 0, pressure: 0, humidity: 0 }
  const tests: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['{}', {}, false],
    ['string', '', false],
    ['number', 42, false],
    ['boolean', true, false],
    [
      'non object main',
      {
        main: 60,
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'null main',
      {
        main: null,
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'null weather',
      {
        main: minMain,
        weather: null,
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'object weather',
      {
        main: minMain,
        weather: {},
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'non array weather',
      {
        main: minMain,
        weather: 17.2,
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'null weather entry',
      {
        main: minMain,
        weather: [null],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'non object weather entry',
      {
        main: minMain,
        weather: [3.1415926],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'non number pressure',
      {
        main: { temp: 0, pressure: '', humidity: 0 },
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'missing pressure',
      {
        main: { temp: 0, humidity: 0 },
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'non number temp',
      {
        main: { temp: {}, pressure: 0, humidity: 0 },
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'missing temp',
      {
        main: { pressure: 0, humidity: 0 },
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'non number humidity',
      {
        main: { temp: 0, pressure: 0, humidity: true },
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'missing humidity',
      {
        main: { temp: 0, pressure: 0 },
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'valid weather entry',
      {
        main: minMain,
        weather: [{ main: '', icon: '' }],
        sys: { sunrise: 0, sunset: 0 },
      },
      true,
    ],
    [
      'non string weather main',
      {
        main: minMain,
        weather: [{ main: 0, icon: '' }],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'null weather main',
      {
        main: minMain,
        weather: [{ main: null, icon: '' }],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'missing weather main',
      {
        main: minMain,
        weather: [{ icon: '' }],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'non string weather icon',
      {
        main: minMain,
        weather: [{ main: '', icon: Number.NaN }],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'null weather icon',
      {
        main: minMain,
        weather: [{ main: '', icon: null }],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'missing weather icon',
      {
        main: minMain,
        weather: [{ main: '' }],
        sys: { sunrise: 0, sunset: 0 },
      },
      false,
    ],
    [
      'missing obj.sys',
      {
        main: minMain,
        weather: [],
      },
      false,
    ],
    [
      'non object obj.sys',
      {
        main: minMain,
        weather: [],
        sys: 'bad data',
      },
      false,
    ],
    [
      'null obj.sys',
      {
        main: minMain,
        weather: [],
        sys: null,
      },
      false,
    ],
    [
      'missing sunrise',
      {
        main: minMain,
        weather: [],
        sys: { sunset: 0 },
      },
      false,
    ],
    [
      'non number sunrise',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: {}, sunset: 0 },
      },
      false,
    ],
    [
      'NaN sunrise',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: Number.NaN, sunset: 0 },
      },
      true,
    ],
    [
      'positive sunrise',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: 89.34, sunset: 0 },
      },
      true,
    ],
    [
      'negative sunrise',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: -3.14159, sunset: 0 },
      },
      true,
    ],
    [
      'missing sunset',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: 0 },
      },
      false,
    ],
    [
      'non number sunset',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: 0, sunset: 'Number' },
      },
      false,
    ],
    [
      'NaN sunset',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: 0, sunset: Number.NaN },
      },
      true,
    ],
    [
      'positive sunset',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: 0, sunset: 9001 },
      },
      true,
    ],
    [
      'negative sunset',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: 0, sunset: -50090 },
      },
      true,
    ],
    [
      'minimum object',
      {
        main: minMain,
        weather: [],
        sys: { sunrise: 0, sunset: 0 },
      },
      true,
    ],
  ]
  tests.forEach(([title, obj, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(Functions.isOpenWeatherData(obj)).to.equal(expected)
    })
  })
})
