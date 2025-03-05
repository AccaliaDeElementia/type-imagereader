'use sanity'

import { CyclicUpdater } from './updater'
import { type WeatherResults, isWeatherResults } from '../../../contracts/weather'

type HTMLElementish = HTMLElement | null | undefined
type stringish = string | null | undefined
export const Functions = {
  fetch,
  FetchWeather,
  ShowData,
  ShowIcon,
  ShowWeather,
  SetAlmanac,
}

async function FetchWeather(uri: string | URL): Promise<WeatherResults> {
  const response = await Functions.fetch(uri)
  const data: unknown = await response.json()
  if (!isWeatherResults(data)) throw new Error('Invalid WeatherResponse Retrieved')
  return data
}

function ShowData(container: HTMLElementish, element: HTMLElementish, text: stringish): void {
  if (container == null || element == null) return
  if (text == null || text.length < 1) {
    container.style.setProperty('display', 'none')
    return
  }
  container.style.setProperty('display', 'flex')
  element.replaceChildren(text)
}

function ShowIcon(element: HTMLElementish, icon: stringish): void {
  if (element == null) return
  if (icon == null || icon.length < 1) {
    element.style.setProperty('display', 'none')
    return
  }
  element.style.setProperty('display', 'inline-block')
  element.setAttribute('src', `https://openweathermap.org/img/w/${icon}.png`)
}

function ShowWeather(base: HTMLElementish, weather: WeatherResults): WeatherResults {
  if (base == null) return weather
  const temp = typeof weather.temp === 'number' ? `${weather.temp.toFixed(1)}°C` : null
  Functions.ShowData(base, base.querySelector<HTMLElement>('.temp'), temp)
  const desc = base.querySelector<HTMLElement>('.desc')
  const desctext = desc?.querySelector<HTMLElement>('.desctext')
  Functions.ShowData(desc, desctext, weather.description)
  const icon = base.querySelector<HTMLElement>('.icon')
  Functions.ShowIcon(icon, weather.icon)
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

function SetAlmanac(weather: WeatherResults): void {
  const today = new Date()
  today.setMilliseconds(0)
  today.setSeconds(0)
  today.setHours(6)
  today.setMinutes(15)
  const minrise = today.getTime()
  today.setHours(21)
  today.setMinutes(0)
  const maxset = today.getTime()
  almanac.sunrise = Math.max(weather.sunrise ?? -Infinity, minrise)
  almanac.sunset = Math.min(weather.sunset ?? Infinity, maxset)
}

export const LocalWeatherUpdater = CyclicUpdater.create(async () => {
  await Functions.FetchWeather('http://localhost:8080/').then((weather) =>
    Functions.ShowWeather(document.querySelector<HTMLElement>('.localweather'), weather),
  )
}, 1000)

export const WeatherUpdater = CyclicUpdater.create(async () => {
  await Functions.FetchWeather('/weather')
    .then((weather) => Functions.ShowWeather(document.querySelector<HTMLElement>('.weather'), weather))
    .then(Functions.SetAlmanac)
}, 60 * 1000)
