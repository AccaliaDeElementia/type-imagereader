'use sanity'

import { CyclicUpdater } from './updater.js'
import { type WeatherResults, isWeatherResults } from '#contracts/weather.js'
import { hasValue, stringishHasValue } from '#utils/helpers.js'

type HTMLElementish = HTMLElement | null | undefined
type HTMLImageElementish = HTMLImageElement | null | undefined
type Stringish = string | null | undefined
const MS_PER_SECOND = 1000
const FETCH_TIMEOUT_SECONDS = 60
const FETCH_TIMEOUT_MS = FETCH_TIMEOUT_SECONDS * MS_PER_SECOND

async function fetchWeather(uri: string | URL): Promise<WeatherResults> {
  const response = await window.fetch(uri, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  const data: unknown = await response.json()
  if (!isWeatherResults(data)) throw new Error('Invalid WeatherResponse Retrieved')
  return data
}

function showData(container: HTMLElementish, element: HTMLElementish, text: Stringish): void {
  if (!hasValue(container) || !hasValue(element)) return
  if (!stringishHasValue(text)) {
    container.style.setProperty('display', 'none')
    return
  }
  container.style.setProperty('display', 'flex')
  element.replaceChildren(text)
}

const boundIcons = new WeakSet<HTMLImageElement>()

function bindIconHandlers(element: HTMLImageElement): void {
  if (boundIcons.has(element)) return
  boundIcons.add(element)
  element.addEventListener('load', () => {
    element.style.setProperty('display', 'inline-block')
  })
  element.addEventListener('error', () => {
    element.style.setProperty('display', 'none')
  })
}

function showIcon(element: HTMLImageElementish, icon: Stringish): void {
  if (!hasValue(element)) return
  if (!stringishHasValue(icon)) {
    element.style.setProperty('display', 'none')
    return
  }
  bindIconHandlers(element)
  element.style.setProperty('display', 'none')
  element.setAttribute('src', `/weather/icon/${icon}`)
}
const DECIMAL_PLACES = 1
function showWeather(base: HTMLElementish, weather: WeatherResults): WeatherResults {
  if (!hasValue(base)) return weather
  const temp =
    typeof weather.temp === 'number' && Number.isFinite(weather.temp)
      ? `${weather.temp.toFixed(DECIMAL_PLACES)}°C`
      : null
  Internals.showData(base, base.querySelector<HTMLElement>('.temp'), temp)
  const desc = base.querySelector<HTMLElement>('.desc')
  const desctext = desc?.querySelector<HTMLElement>('.desctext')
  Internals.showData(desc, desctext, weather.description)
  const icon = base.querySelector<HTMLImageElement>('.icon')
  Internals.showIcon(icon, weather.icon)
  return weather
}

export interface SunTimes {
  sunrise: number
  sunset: number
}

const UNSET_SUNRISE = -Infinity
const UNSET_SUNSET = Infinity

const almanac: SunTimes = {
  sunrise: UNSET_SUNRISE,
  sunset: UNSET_SUNSET,
}

export function getAlmanac(): SunTimes {
  return almanac
}

const ZERO_TIME = 0
const DEFAULT_SUNRISE_HOUR = 6
const DEFAULT_SUNRISE_MINUTE = 15
const DEFAULT_SUNSET_HOUR = 21
const DEFAULT_SUNSET_MINUTE = 0

function setAlmanac(weather: WeatherResults): void {
  const today = new Date()
  today.setMilliseconds(ZERO_TIME)
  today.setSeconds(ZERO_TIME)
  today.setHours(DEFAULT_SUNRISE_HOUR)
  today.setMinutes(DEFAULT_SUNRISE_MINUTE)
  const minrise = today.getTime()
  today.setHours(DEFAULT_SUNSET_HOUR)
  today.setMinutes(DEFAULT_SUNSET_MINUTE)
  const maxset = today.getTime()
  almanac.sunrise = Math.max(weather.sunrise ?? UNSET_SUNRISE, minrise)
  almanac.sunset = Math.min(weather.sunset ?? UNSET_SUNSET, maxset)
}

export const Internals = {
  fetchWeather,
  showData,
  showIcon,
  showWeather,
  setAlmanac,
}

const LOCAL_WEATHER_UPDATE_INTERVAL = 1_000
export const localWeatherUpdater = new CyclicUpdater(async () => {
  await Internals.fetchWeather('https://localhost:8443/').then((weather) =>
    Internals.showWeather(document.querySelector<HTMLElement>('.localweather'), weather),
  )
}, LOCAL_WEATHER_UPDATE_INTERVAL)

const REMOTE_WEATHER_UPDATE_INTERVAL = 60_000
export const weatherUpdater = new CyclicUpdater(async () => {
  await Internals.fetchWeather('/weather')
    .then((weather) => Internals.showWeather(document.querySelector<HTMLElement>('.weather'), weather))
    .then(Internals.setAlmanac)
}, REMOTE_WEATHER_UPDATE_INTERVAL)
