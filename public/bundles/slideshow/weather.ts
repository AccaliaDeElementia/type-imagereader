// use sanity

/* global HTMLElement */

import { CyclicUpdater } from './updater'

interface WeatherResults {
  temp: number|undefined
  pressure: number|undefined
  humidity: number|undefined
  description: string|undefined
  icon: string|undefined
  sunrise: number|undefined
  sunset: number|undefined
}

const toWeather = (data: any): WeatherResults => {
  return {
    temp: data.temp as number,
    pressure: data.pressure as number,
    humidity: data.humidity as number,
    description: data.description as string,
    icon: data.icon as string,
    sunrise: data.sunrise as number,
    sunset: data.sunset as number
  }
}

const fetchWeather = (uri: string): Promise<WeatherResults> => fetch(uri)
  .then(result => result.json())
  .then(toWeather)

const formatData = (d: any, suffix = '') => {
  if (d === undefined || d === null) {
    return ''
  } else if (typeof d === 'number') {
    return `${d.toFixed(1)}${suffix}`
  } else {
    return `${d}${suffix}`
  }
}

const showWeather = (base: HTMLElement | null, weather: WeatherResults): WeatherResults => {
  if (!base) return weather
  base.style.display = weather.temp !== undefined ? 'flex' : 'none'
  const tempElem = base.querySelector('.temp')
  if (tempElem) {
    tempElem.innerHTML = formatData(weather.temp, '&deg;C')
  }
  const description = base.querySelector('.desc') as HTMLElement
  if (description) {
    description.style.display = weather.description !== undefined ? 'flex' : 'none'
    const descriptText = base.querySelector('.desctext')
    if (descriptText) {
      descriptText.innerHTML = formatData(weather.description)
    }
    const iconElem = base.querySelector('.icon') as HTMLElement
    if (iconElem) {
      iconElem.style.display = weather.icon ? 'inline-block' : 'none'
      const src = `https://openweathermap.org/img/w/${weather.icon}.png`
      if (iconElem.getAttribute('src') !== src) {
        iconElem.setAttribute('src', src)
      }
    }
  }
  return weather
}

export interface SunTimes {
  sunrise: number
  sunset: number
}

const almanac: SunTimes = {
  sunrise: -Infinity,
  sunset: Infinity
}

export const GetAlmanac = (): SunTimes => almanac

export const LocalWeatherUpdater = CyclicUpdater.create(() =>
  fetchWeather('http://localhost:8080/')
    .then(weather => showWeather(document.querySelector('.localweather'), weather)), 1000)

export const WeatherUpdater = CyclicUpdater.create(() =>
  fetchWeather('/weather')
    .then(weather => showWeather(document.querySelector('.weather'), weather))
    .then(weather => {
      const today = new Date()
      today.setMilliseconds(0)
      today.setSeconds(0)
      today.setMinutes(0)
      if (weather.sunrise) {
        almanac.sunrise = weather.sunrise
      } else {
        today.setHours(6)
        almanac.sunrise = today.getTime()
      }
      if (weather.sunset) {
        almanac.sunset = weather.sunset
      } else {
        today.setHours(21)
        almanac.sunset = today.getTime()
      }
    }), 60 * 1000)
