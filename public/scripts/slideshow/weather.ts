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

const fetchWeather = async (uri: string): Promise<WeatherResults> => await fetch(uri)
  .then(async result => await (result.json() as Promise<WeatherResults>))

const formatData = (data: any, suffix = ''): Text => {
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
  const description = base.querySelector('.desc') as unknown as HTMLElement
  description?.style.setProperty('display', weather.description !== undefined ? 'flex' : 'none')
  base.querySelector('.desctext')?.replaceChildren(formatData(weather.description))
  const icon = base.querySelector('.icon') as unknown as HTMLElement
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

export const LocalWeatherUpdater = CyclicUpdater.create(async () =>
  await fetchWeather('http://localhost:8080/')
    .then(weather => showWeather(document.querySelector('.localweather'), weather))
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
