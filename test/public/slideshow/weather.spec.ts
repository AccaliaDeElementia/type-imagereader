'use sanity'

import { assert, expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import {
  GetAlmanac,
  LocalWeatherUpdater,
  WeatherUpdater,
  Functions,
  isWeatherResults,
} from '../../../public/scripts/slideshow/weather'
import { ForceCastTo } from '../../testutils/TypeGuards'

const markup = `
html
  body
    div.text.weather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
    div.text.localweather(style='display: none')
      div.temp
      div.desc
        span.desctext
        img.icon
`

interface FetchDataMap {
  sunrise?: number
  sunset?: number
  temp?: number
  description?: string
  icon?: string
}

@suite
export class SlideshowWeatherIsWeatehrResultsTests {
  @test
  'it should accept minimum object'(): void {
    const obj = {}
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should reject non number temp object'(): void {
    const obj = {
      temp: {},
    }
    expect(isWeatherResults(obj)).to.equal(false)
  }

  @test
  'it should accept undefined temp object'(): void {
    const obj = {
      temp: undefined,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept number temp object'(): void {
    const obj = {
      temp: 42,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept missing temp object'(): void {
    const obj = {
      pressure: 0,
      humidity: 0,
      description: '',
      icon: '',
      sunrise: 0,
      sunset: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should reject non number pressure object'(): void {
    const obj = {
      pressure: {},
    }
    expect(isWeatherResults(obj)).to.equal(false)
  }

  @test
  'it should accept undefined pressure object'(): void {
    const obj = {
      pressure: undefined,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept number pressure object'(): void {
    const obj = {
      pressure: 42,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept missing pressure object'(): void {
    const obj = {
      temp: 0,
      humidity: 0,
      description: '',
      icon: '',
      sunrise: 0,
      sunset: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should reject non number humidity object'(): void {
    const obj = {
      humidity: {},
    }
    expect(isWeatherResults(obj)).to.equal(false)
  }

  @test
  'it should accept undefined humidity object'(): void {
    const obj = {
      humidity: undefined,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept number humidity object'(): void {
    const obj = {
      humidity: 42,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept missing humidity object'(): void {
    const obj = {
      temp: 0,
      pressure: 0,
      description: '',
      icon: '',
      sunrise: 0,
      sunset: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should reject non string description object'(): void {
    const obj = {
      description: {},
    }
    expect(isWeatherResults(obj)).to.equal(false)
  }

  @test
  'it should accept undefined description object'(): void {
    const obj = {
      description: undefined,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept string description object'(): void {
    const obj = {
      description: '42',
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept missing description object'(): void {
    const obj = {
      temp: 0,
      pressure: 0,
      humidity: 0,
      icon: '',
      sunrise: 0,
      sunset: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should reject non string icon object'(): void {
    const obj = {
      icon: {},
    }
    expect(isWeatherResults(obj)).to.equal(false)
  }

  @test
  'it should accept undefined icon object'(): void {
    const obj = {
      icon: undefined,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept string icon object'(): void {
    const obj = {
      icon: '42',
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept missing icon object'(): void {
    const obj = {
      temp: 0,
      pressure: 0,
      humidity: 0,
      description: '',
      sunrise: 0,
      sunset: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should reject non number sunrise object'(): void {
    const obj = {
      sunrise: {},
    }
    expect(isWeatherResults(obj)).to.equal(false)
  }

  @test
  'it should accept undefined sunrise object'(): void {
    const obj = {
      sunrise: undefined,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept number sunrise object'(): void {
    const obj = {
      sunrise: 42,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept missing sunrise object'(): void {
    const obj = {
      temp: 0,
      pressure: 0,
      humidity: 0,
      description: '',
      icon: '',
      sunset: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should reject non number sunset object'(): void {
    const obj = {
      sunset: {},
    }
    expect(isWeatherResults(obj)).to.equal(false)
  }

  @test
  'it should accept undefined sunset object'(): void {
    const obj = {
      sunset: undefined,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept number sunset object'(): void {
    const obj = {
      sunset: 42,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept missing sunset object'(): void {
    const obj = {
      temp: 0,
      pressure: 0,
      humidity: 0,
      description: '',
      icon: '',
      sunrise: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }

  @test
  'it should accept full object'(): void {
    const obj = {
      temp: 0,
      pressure: 0,
      humidity: 0,
      description: '',
      icon: '',
      sunrise: 0,
      sunset: 0,
    }
    expect(isWeatherResults(obj)).to.equal(true)
  }
}

@suite
export class SlideshowWeatherTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  fetchStub: sinon.SinonStub
  fetchData: FetchDataMap = {}
  clock: sinon.SinonFakeTimers | undefined
  constructor() {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('')
    this.fetchStub = sinon.stub()
  }

  async before(): Promise<void> {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.existingWindow = global.window
    global.window = ForceCastTo<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => this.dom.window.document,
    })

    this.fetchStub = sinon.stub()
    this.fetchStub.resolves({
      json: async () => await Promise.resolve(this.fetchData),
    })
    Functions.fetch = this.fetchStub

    this.fetchData = {
      sunrise: -Infinity,
      sunset: Infinity,
    }
    await WeatherUpdater.updateFn()
    this.fetchData = {}
  }

  after(): void {
    global.window = this.existingWindow
    Object.defineProperty(global, 'document', {
      configurable: true,
      get: () => this.existingDocument,
    })

    Functions.fetch = global.fetch

    this.clock?.restore()
    this.clock = undefined
  }

  @test
  async 'LocalWeatherUpdater fetches from localhost'(): Promise<void> {
    this.fetchData = {}
    await LocalWeatherUpdater.updateFn()
    expect(this.fetchStub.calledWithExactly('http://localhost:8080/')).to.equal(true)
  }

  @test
  'LocalWeatherUpdater Has a period of 1000ms'(): void {
    expect(LocalWeatherUpdater.period).to.equal(1000)
  }

  @test
  async 'LocalWeatherUpdater hides weather when temp is undefined'(): Promise<void> {
    this.fetchData = {
      temp: undefined,
    }
    await LocalWeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector<HTMLElement>('.localweather')
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'LocalWeatherUpdater unhides weather when temp is set'(): Promise<void> {
    this.fetchData = {
      temp: -273.15,
    }
    await LocalWeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector<HTMLElement>('.localweather')
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'LocalWeatherUpdater sets temperature text'(): Promise<void> {
    this.fetchData = {
      temp: -273.15,
    }
    await LocalWeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector<HTMLElement>('.localweather .temp')
    expect(base).to.not.equal(null)
    expect(base?.innerHTML).to.equal('-273.1°C')
  }

  @test
  async 'LocalWeatherUpdater hides Description when undefined'(): Promise<void> {
    this.fetchData = {
      description: undefined,
    }
    await LocalWeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector<HTMLElement>('.localweather .desc')
    expect(description?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'LocalWeatherUpdater unhides Description when set'(): Promise<void> {
    this.fetchData = {
      description: `data${Math.random()}`,
    }
    await LocalWeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector<HTMLElement>('.localweather .desc')
    expect(description?.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'LocalWeatherUpdater writes Description when set'(): Promise<void> {
    const expected = `data${Math.random()}`
    this.fetchData = {
      description: expected,
    }
    await LocalWeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector<HTMLElement>('.localweather .desctext')
    expect(description?.innerHTML).to.equal(expected)
  }

  @test
  async 'LocalWeatherUpdater hides weather icon when undefined'(): Promise<void> {
    this.fetchData = {
      icon: undefined,
    }
    await LocalWeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector<HTMLElement>('.localweather .icon')
    expect(icon?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'LocalWeatherUpdater unhides weather icon when set'(): Promise<void> {
    this.fetchData = {
      icon: 'sunnyDays',
    }
    await LocalWeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector<HTMLElement>('.localweather .icon')
    expect(icon?.style.getPropertyValue('display')).to.equal('inline-block')
  }

  @test
  async 'LocalWeatherUpdater sets weather icon src not yet set'(): Promise<void> {
    this.fetchData = {
      icon: 'sunnyDays',
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    await LocalWeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector<HTMLElement>('.localweather .icon')
    expect(icon?.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'LocalWeatherUpdater sets weather icon src already'(): Promise<void> {
    this.fetchData = {
      icon: 'sunnyDays',
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    const icon = this.dom.window.document.querySelector<HTMLElement>('.localweather .icon')
    icon?.setAttribute('src', expected)
    await LocalWeatherUpdater.updateFn()
    expect(icon?.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'LocalWeatherUpdater gracefully handles missing base element'(): Promise<void> {
    this.fetchData = {}
    const base = this.dom.window.document.querySelector<HTMLElement>('.localweather')
    base?.remove()
    await LocalWeatherUpdater.updateFn()
    assert(true, 'This test passes if it does not throw error prior to this line')
  }

  @test
  async 'LocalWeatherUpdater throws error when invalid response fetched'(): Promise<void> {
    this.fetchStub.resolves({
      json: async () => await Promise.resolve(null),
    })
    try {
      await LocalWeatherUpdater.updateFn()
      expect.fail('Should have received an error not a success!')
    } catch (e: unknown) {
      if (!(e instanceof Error)) expect.fail('should have received an instance of an error!')
      expect(e.message).to.equal('Invalid JSON Object provided as input')
    }
  }

  @test
  async 'WeatherUpdater fetches from server'(): Promise<void> {
    this.fetchData = {}
    await WeatherUpdater.updateFn()
    expect(this.fetchStub.calledWithExactly('/weather')).to.equal(true)
  }

  @test
  'WeatherUpdater Has a period of 1 minute'(): void {
    expect(WeatherUpdater.period).to.equal(60 * 1000)
  }

  @test
  async 'WeatherUpdater hides weather when temp is undefined'(): Promise<void> {
    this.fetchData = {
      temp: undefined,
    }
    await WeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector<HTMLElement>('.weather')
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'WeatherUpdater unhides weather when temp is set'(): Promise<void> {
    this.fetchData = {
      temp: -273.15,
    }
    await WeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector<HTMLElement>('.weather')
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'WeatherUpdater sets temperature text'(): Promise<void> {
    this.fetchData = {
      temp: -273.15,
    }
    await WeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector<HTMLElement>('.weather .temp')
    expect(base).to.not.equal(null)
    expect(base?.innerHTML).to.equal('-273.1°C')
  }

  @test
  async 'WeatherUpdater hides Description when undefined'(): Promise<void> {
    this.fetchData = {
      description: undefined,
    }
    await WeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector<HTMLElement>('.weather .desc')
    expect(description?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'WeatherUpdater unhides Description when set'(): Promise<void> {
    this.fetchData = {
      description: `data${Math.random()}`,
    }
    await WeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector<HTMLElement>('.weather .desc')
    expect(description?.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'WeatherUpdater writes Description when set'(): Promise<void> {
    const expected = `data${Math.random()}`
    this.fetchData = {
      description: expected,
    }
    await WeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector<HTMLElement>('.weather .desctext')
    expect(description?.innerHTML).to.equal(expected)
  }

  @test
  async 'WeatherUpdater hides weather icon when undefined'(): Promise<void> {
    this.fetchData = {
      icon: undefined,
    }
    await WeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector<HTMLElement>('.weather .icon')
    expect(icon?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'WeatherUpdater unhides weather icon when set'(): Promise<void> {
    this.fetchData = {
      icon: 'sunnyDays',
    }
    await WeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector<HTMLElement>('.weather .icon')
    expect(icon?.style.getPropertyValue('display')).to.equal('inline-block')
  }

  @test
  async 'WeatherUpdater sets weather icon src not yet set'(): Promise<void> {
    this.fetchData = {
      icon: 'sunnyDays',
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    await WeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector<HTMLElement>('.weather .icon')
    expect(icon?.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'WeatherUpdater sets weather icon src already'(): Promise<void> {
    this.fetchData = {
      icon: 'sunnyDays',
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    const icon = this.dom.window.document.querySelector<HTMLElement>('.weather .icon')
    icon?.setAttribute('src', expected)
    await WeatherUpdater.updateFn()
    expect(icon?.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'WeatherUpdater throws error when invalid response fetched'(): Promise<void> {
    this.fetchStub.resolves({
      json: async () => await Promise.resolve(null),
    })
    try {
      await WeatherUpdater.updateFn()
      expect.fail('Should have received an error not a success!')
    } catch (e: unknown) {
      if (!(e instanceof Error)) expect.fail('should have received an instance of an error!')
      expect(e.message).to.equal('Invalid JSON Object provided as input')
    }
  }

  @test
  async 'WeatherUpdater gracefully handles missing base element'(): Promise<void> {
    this.fetchData = {}
    const base = this.dom.window.document.querySelector<HTMLElement>('.localweather')
    base?.remove()
    await WeatherUpdater.updateFn()
    assert(true, 'This test passes if it does not throw error prior to this line')
  }

  @test
  async 'Almanac defaults to 06:15 sunrise'(): Promise<void> {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false,
    })
    this.fetchData = {}
    await WeatherUpdater.updateFn()
    const { sunrise } = GetAlmanac()
    now.setHours(6)
    now.setMinutes(15)
    expect(sunrise).to.equal(now.getTime())
  }

  @test
  async 'Almanac sets secified time as sunrise'(): Promise<void> {
    const now = new Date('1999-12-31T23:59:59.999Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false,
    })
    const expected = new Date('1970-01-01T00:00:00.001Z')
    this.fetchData = {
      sunrise: expected.getTime(),
    }
    await WeatherUpdater.updateFn()
    const { sunrise } = GetAlmanac()
    expect(sunrise).to.equal(expected.getTime())
  }

  @test
  async 'Almanac not set for local weather'(): Promise<void> {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false,
    })
    const expected = new Date('1970-01-01T00:00:00.001Z')
    this.fetchData = {
      sunrise: expected.getTime(),
    }
    await LocalWeatherUpdater.updateFn()
    const { sunrise } = GetAlmanac()
    expect(sunrise).to.not.equal(expected.getTime())
  }

  @test
  async 'Almanac defaults to 21:00 sunset'(): Promise<void> {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false,
    })
    this.fetchData = {}
    await WeatherUpdater.updateFn()
    const { sunset } = GetAlmanac()
    now.setHours(21)
    expect(sunset).to.equal(now.getTime())
  }

  @test
  async 'Almanac sets secified time as sunset'(): Promise<void> {
    const now = new Date('1999-12-31T23:59:59.999Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false,
    })
    const expected = new Date('1969-07-20T20:17:00.000Z')
    this.fetchData = {
      sunset: expected.getTime(),
    }
    await WeatherUpdater.updateFn()
    const { sunset } = GetAlmanac()
    expect(sunset).to.equal(expected.getTime())
  }
}
