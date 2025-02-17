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

function isValidTemps(obj: object): boolean {
  if ('temp' in obj && obj.temp !== undefined && typeof obj.temp !== 'number') return false
  if ('pressure' in obj && obj.pressure !== undefined && typeof obj.pressure !== 'number') return false
  if ('humidity' in obj && obj.humidity !== undefined && typeof obj.humidity !== 'number') return false
  return true
}

function isValidDescriptions(obj: object): boolean {
  if ('description' in obj && obj.description !== undefined && typeof obj.description !== 'string') return false
  if ('icon' in obj && obj.icon !== undefined && typeof obj.icon !== 'string') return false
  return true
}

function isValidSunData(obj: object): boolean {
  if ('sunrise' in obj && obj.sunrise !== undefined && typeof obj.sunrise !== 'number') return false
  if ('sunset' in obj && obj.sunset !== undefined && typeof obj.sunset !== 'number') return false
  return true
}

export function isWeatherResults(obj: unknown): obj is WeatherResults {
  if (obj == null || typeof obj !== 'object') return false
  return isValidTemps(obj) && isValidDescriptions(obj) && isValidSunData(obj)
}

export const Functions = {
  fetch,
}

const fetchWeather = async (uri: string): Promise<WeatherResults> =>
  await Functions.fetch(uri).then(async (result) => {
    const data = (await result.json()) as unknown
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

function setVisibility(elem: HTMLElement | null, data: unknown, styleExists: string, styleNotExists: string): void {
  elem?.style.setProperty('display', data != null ? styleExists : styleNotExists)
}

const showWeather = (base: HTMLElement | null, weather: WeatherResults): WeatherResults => {
  if (base == null) return weather
  setVisibility(base, weather.temp, 'flex', 'none')
  base.querySelector('.temp')?.replaceChildren(formatData(weather.temp, '°C'))
  setVisibility(base.querySelector<HTMLElement>('.desc'), weather.description, 'flex', 'none')
  base.querySelector('.desctext')?.replaceChildren(formatData(weather.description))
  const icon = base.querySelector<HTMLElement>('.icon')
  setVisibility(icon, weather.icon, 'inline-block', 'none')
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
  sunset: Infinity,
}

export const GetAlmanac = (): SunTimes => almanac

export const LocalWeatherUpdater = CyclicUpdater.create(async () => {
  await fetchWeather('http://localhost:8080/').then((weather) =>
    showWeather(document.querySelector('.localweather'), weather),
  )
}, 1000)

export const WeatherUpdater = CyclicUpdater.create(async () => {
  await fetchWeather('/weather')
    .then((weather) => showWeather(document.querySelector('.weather'), weather))
    .then((weather) => {
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
}, 60 * 1000)
