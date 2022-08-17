'use sanity'

import { assert, expect } from 'chai'
import { suite, test, timeout, slow } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { GetAlmanac, LocalWeatherUpdater, WeatherUpdater } from '../../../public/scripts/slideshow/weather'

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

@suite(timeout(1000), slow(100))
export class SlideshowWeatherTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  fetchStub: sinon.SinonStub
  fetchData: any
  clock: sinon.SinonFakeTimers | undefined
  constructor () {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('')
    this.fetchStub = sinon.stub()
  }

  async before (): Promise<void> {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999'
    })
    this.existingWindow = global.window
    global.window = (this.dom.window as unknown) as Window & typeof globalThis
    this.existingDocument = global.document
    global.document = this.dom.window.document

    this.fetchStub = sinon.stub(global, 'fetch')
    this.fetchStub.resolves({
      json: () => Promise.resolve(this.fetchData)
    } as Response)

    this.fetchData = {
      sunrise: -Infinity,
      sunset: Infinity
    }
    await WeatherUpdater.updateFn()
    this.fetchData = {}
  }

  async after (): Promise<void> {
    global.window = this.existingWindow
    global.document = this.existingDocument

    this.fetchStub.restore()

    this.clock?.restore()
    this.clock = undefined
  }

  @test
  async 'LocalWeatherUpdater fetches from localhost' () {
    this.fetchData = {}
    await LocalWeatherUpdater.updateFn()
    expect(this.fetchStub.calledWithExactly('http://localhost:8080/')).to.equal(true)
  }

  @test
  async 'LocalWeatherUpdater Has a period of 1000ms' () {
    expect(LocalWeatherUpdater.period).to.equal(1000)
  }

  @test
  async 'LocalWeatherUpdater hides weather when temp is undefined' () {
    this.fetchData = {
      temp: undefined
    }
    await LocalWeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector('.localweather') as HTMLElement|null
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'LocalWeatherUpdater unhides weather when temp is set' () {
    this.fetchData = {
      temp: -273.15
    }
    await LocalWeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector('.localweather') as HTMLElement|null
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'LocalWeatherUpdater sets temperature text' () {
    this.fetchData = {
      temp: -273.15
    }
    await LocalWeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector('.localweather .temp') as HTMLElement|null
    expect(base).to.not.equal(null)
    expect(base?.innerHTML).to.equal('-273.1°C')
  }

  @test
  async 'LocalWeatherUpdater hides Description when undefined' () {
    this.fetchData = {
      description: undefined
    }
    await LocalWeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector('.localweather .desc') as HTMLElement
    expect(description.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'LocalWeatherUpdater unhides Description when set' () {
    this.fetchData = {
      description: `data${Math.random()}`
    }
    await LocalWeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector('.localweather .desc') as HTMLElement
    expect(description.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'LocalWeatherUpdater writes Description when set' () {
    const expected = `data${Math.random()}`
    this.fetchData = {
      description: expected
    }
    await LocalWeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector('.localweather .desctext') as HTMLElement
    expect(description.innerHTML).to.equal(expected)
  }

  @test
  async 'LocalWeatherUpdater hides weather icon when undefined' () {
    this.fetchData = {
      icon: undefined
    }
    await LocalWeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector('.localweather .icon') as HTMLElement
    expect(icon.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'LocalWeatherUpdater unhides weather icon when set' () {
    this.fetchData = {
      icon: 'sunnyDays'
    }
    await LocalWeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector('.localweather .icon') as HTMLElement
    expect(icon.style.getPropertyValue('display')).to.equal('inline-block')
  }

  @test
  async 'LocalWeatherUpdater sets weather icon src not yet set' () {
    this.fetchData = {
      icon: 'sunnyDays'
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    await LocalWeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector('.localweather .icon') as HTMLElement
    expect(icon.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'LocalWeatherUpdater sets weather icon src already' () {
    this.fetchData = {
      icon: 'sunnyDays'
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    const icon = this.dom.window.document.querySelector('.localweather .icon') as HTMLElement
    icon.setAttribute('src', expected)
    await LocalWeatherUpdater.updateFn()
    expect(icon.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'LocalWeatherUpdater gracefully handles missing base element' () {
    this.fetchData = {}
    const base = this.dom.window.document.querySelector('.localweather') as HTMLElement
    base.remove()
    await LocalWeatherUpdater.updateFn()
    assert(true, 'This test passes if it does not throw error prior to this line')
  }

  @test
  async 'WeatherUpdater fetches from server' () {
    this.fetchData = {}
    await WeatherUpdater.updateFn()
    expect(this.fetchStub.calledWithExactly('/weather')).to.equal(true)
  }

  @test
  async 'WeatherUpdater Has a period of 1 minute' () {
    expect(WeatherUpdater.period).to.equal(60 * 1000)
  }

  @test
  async 'WeatherUpdater hides weather when temp is undefined' () {
    this.fetchData = {
      temp: undefined
    }
    await WeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector('.weather') as HTMLElement|null
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'WeatherUpdater unhides weather when temp is set' () {
    this.fetchData = {
      temp: -273.15
    }
    await WeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector('.weather') as HTMLElement|null
    expect(base).to.not.equal(null)
    expect(base?.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'WeatherUpdater sets temperature text' () {
    this.fetchData = {
      temp: -273.15
    }
    await WeatherUpdater.updateFn()
    const base = this.dom.window.document.querySelector('.weather .temp') as HTMLElement|null
    expect(base).to.not.equal(null)
    expect(base?.innerHTML).to.equal('-273.1°C')
  }

  @test
  async 'WeatherUpdater hides Description when undefined' () {
    this.fetchData = {
      description: undefined
    }
    await WeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector('.weather .desc') as HTMLElement
    expect(description.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'WeatherUpdater unhides Description when set' () {
    this.fetchData = {
      description: `data${Math.random()}`
    }
    await WeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector('.weather .desc') as HTMLElement
    expect(description.style.getPropertyValue('display')).to.equal('flex')
  }

  @test
  async 'WeatherUpdater writes Description when set' () {
    const expected = `data${Math.random()}`
    this.fetchData = {
      description: expected
    }
    await WeatherUpdater.updateFn()
    const description = this.dom.window.document.querySelector('.weather .desctext') as HTMLElement
    expect(description.innerHTML).to.equal(expected)
  }

  @test
  async 'WeatherUpdater hides weather icon when undefined' () {
    this.fetchData = {
      icon: undefined
    }
    await WeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector('.weather .icon') as HTMLElement
    expect(icon.style.getPropertyValue('display')).to.equal('none')
  }

  @test
  async 'WeatherUpdater unhides weather icon when set' () {
    this.fetchData = {
      icon: 'sunnyDays'
    }
    await WeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector('.weather .icon') as HTMLElement
    expect(icon.style.getPropertyValue('display')).to.equal('inline-block')
  }

  @test
  async 'WeatherUpdater sets weather icon src not yet set' () {
    this.fetchData = {
      icon: 'sunnyDays'
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    await WeatherUpdater.updateFn()
    const icon = this.dom.window.document.querySelector('.weather .icon') as HTMLElement
    expect(icon.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'WeatherUpdater sets weather icon src already' () {
    this.fetchData = {
      icon: 'sunnyDays'
    }
    const expected = 'https://openweathermap.org/img/w/sunnyDays.png'
    const icon = this.dom.window.document.querySelector('.weather .icon') as HTMLElement
    icon.setAttribute('src', expected)
    await WeatherUpdater.updateFn()
    expect(icon.getAttribute('src')).to.equal(expected)
  }

  @test
  async 'WeatherUpdater gracefully handles missing base element' () {
    this.fetchData = {}
    const base = this.dom.window.document.querySelector('.localweather') as HTMLElement
    base.remove()
    await WeatherUpdater.updateFn()
    assert(true, 'This test passes if it does not throw error prior to this line')
  }

  @test
  async 'Almanac defaults to 06:15 sunrise' () {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    this.fetchData = {}
    await WeatherUpdater.updateFn()
    const { sunrise } = GetAlmanac()
    now.setHours(6)
    now.setMinutes(15)
    expect(sunrise).to.equal(now.getTime())
  }

  @test
  async 'Almanac sets secified time as sunrise' () {
    const now = new Date('1999-12-31T23:59:59.999Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    const expected = new Date('1970-01-01T00:00:00.001Z')
    this.fetchData = {
      sunrise: expected.getTime()
    }
    await WeatherUpdater.updateFn()
    const { sunrise } = GetAlmanac()
    expect(sunrise).to.equal(expected.getTime())
  }

  @test
  async 'Almanac not set for local weather' () {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    const expected = new Date('1970-01-01T00:00:00.001Z')
    this.fetchData = {
      sunrise: expected.getTime()
    }
    await LocalWeatherUpdater.updateFn()
    const { sunrise } = GetAlmanac()
    expect(sunrise).to.not.equal(expected.getTime())
  }

  @test
  async 'Almanac defaults to 21:00 sunset' () {
    const now = new Date('1999-12-31T12:00:00.000Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    this.fetchData = {}
    await WeatherUpdater.updateFn()
    const { sunset } = GetAlmanac()
    now.setHours(21)
    expect(sunset).to.equal(now.getTime())
  }

  @test
  async 'Almanac sets secified time as sunset' () {
    const now = new Date('1999-12-31T23:59:59.999Z')
    this.clock = sinon.useFakeTimers({
      now: now.getTime(),
      shouldClearNativeTimers: false
    })
    const expected = new Date('1969-07-20T20:17:00.000Z')
    this.fetchData = {
      sunset: expected.getTime()
    }
    await WeatherUpdater.updateFn()
    const { sunset } = GetAlmanac()
    expect(sunset).to.equal(expected.getTime())
  }
}
