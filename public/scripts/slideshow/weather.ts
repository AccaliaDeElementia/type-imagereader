'use sanity'

import { CyclicUpdater } from './updater'

export interface WeatherResults {
  temp: number | undefined
  pressure: number | undefined
  humidity: number | undefined
  description: string | undefined
  icon: string | undefined
  sunrise: number | undefined
  sunset: number | undefined
}

export function isWeatherResults(obj: unknown): obj is WeatherResults {
  if (obj == null || typeof obj !== 'object') return false
  if ('temp' in obj && obj.temp !== undefined && typeof obj.temp !== 'number') return false
  if ('pressure' in obj && obj.pressure !== undefined && typeof obj.pressure !== 'number') return false
  if ('humidity' in obj && obj.humidity !== undefined && typeof obj.humidity !== 'number') return false
  if ('description' in obj && obj.description !== undefined && typeof obj.description !== 'string') return false
  if ('icon' in obj && obj.icon !== undefined && typeof obj.icon !== 'string') return false
  if ('sunrise' in obj && obj.sunrise !== undefined && typeof obj.sunrise !== 'number') return false
  if ('sunset' in obj && obj.sunset !== undefined && typeof obj.sunset !== 'number') return false
  return true
}

export const Functions = {
  fetch
}

const fetchWeather = async (uri: string): Promise<WeatherResults> => await Functions.fetch(uri)
  .then(async result => {
    const data = await result.json() as unknown
    if (!isWeatherResults(data)) throw new Error('Invalid JSON Object provided as input')
    return data
  })

const formatData = (data: number | string | undefined, suffix = ''): Text => {
  let text = ''
  if (typeof data === 'number') {
    text = `${data.toFixed(1)}${suffix}`
  } else if (data != null) {
    text = `${data}${suffix}`
  }
  return document.createTextNode(text)
}

const showWeather = (base: HTMLElement | null, weather: WeatherResults): WeatherResults => {
  if (base == null) return weather
  base.style.setProperty('display', weather.temp !== undefined ? 'flex' : 'none')
  base.querySelector('.temp')?.replaceChildren(formatData(weather.temp, '°C'))
  const description = base.querySelector<HTMLElement>('.desc')
  description?.style.setProperty('display', weather.description !== undefined ? 'flex' : 'none')
  base.querySelector('.desctext')?.replaceChildren(formatData(weather.description))
  const icon = base.querySelector<HTMLElement>('.icon')
  icon?.style.setProperty('display', weather.icon != null ? 'inline-block' : 'none')
  const src = `https://openweathermap.org/img/w/${weather.icon}.png`
  if (icon?.getAttribute('src') !== src) {
    icon?.setAttribute('src', src)
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

export const LocalWeatherUpdater = CyclicUpdater.create(async () => {
  await fetchWeather('http://localhost:8080/')
    .then(weather => showWeather(document.querySelector('.localweather'), weather))
  }
, 1000)

export const WeatherUpdater = CyclicUpdater.create(async () => {
  await fetchWeather('/weather')
    .then(weather => showWeather(document.querySelector('.weather'), weather))
    .then(weather => {
      const today = new Date()
      today.setMilliseconds(0)
      today.setSeconds(0)
      if (weather.sunrise != null) {
        almanac.sunrise = weather.sunrise
      } else {
        today.setHours(6)
        today.setMinutes(15)
        almanac.sunrise = today.getTime()
      }
      if (weather.sunset != null) {
        almanac.sunset = weather.sunset
      } else {
        today.setHours(21)
        today.setMinutes(0)
        almanac.sunset = today.getTime()
      }
    })
}
, 60 * 1000)
