'use sanity'

import { CyclicUpdater } from './updater'
import { type WeatherResults, isWeatherResults } from '#contracts/weather'
import { HasValue, StringishHasValue } from '#utils/helpers'

type HTMLElementish = HTMLElement | null | undefined
type stringish = string | null | undefined
const FETCH_TIMEOUT_MS = 60_000 // standard "long-but-bounded" web request timeout
export const Functions = {
  FetchWeather,
  ShowData,
  ShowIcon,
  ShowWeather,
  SetAlmanac,
}

async function FetchWeather(uri: string | URL): Promise<WeatherResults> {
  const response = await window.fetch(uri, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  const data: unknown = await response.json()
  if (!isWeatherResults(data)) throw new Error('Invalid WeatherResponse Retrieved')
  return data
}

function ShowData(container: HTMLElementish, element: HTMLElementish, text: stringish): void {
  if (!HasValue(container) || !HasValue(element)) return
  if (!StringishHasValue(text)) {
    container.style.setProperty('display', 'none')
    return
  }
  container.style.setProperty('display', 'flex')
  element.replaceChildren(text)
}

function ShowIcon(element: HTMLElementish, icon: stringish): void {
  if (!HasValue(element)) return
  if (!StringishHasValue(icon)) {
    element.style.setProperty('display', 'none')
    return
  }
  element.style.setProperty('display', 'inline-block')
  element.setAttribute('src', `https://openweathermap.org/img/w/${icon}.png`)
}
const DECIMAL_PLACES = 1
function ShowWeather(base: HTMLElementish, weather: WeatherResults): WeatherResults {
  if (!HasValue(base)) return weather
  const temp =
    typeof weather.temp === 'number' && Number.isFinite(weather.temp)
      ? `${weather.temp.toFixed(DECIMAL_PLACES)}°C`
      : null
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

const UNSET_SUNRISE = -Infinity // Math.max identity: any real timestamp wins
const UNSET_SUNSET = Infinity // Math.min identity: any real timestamp wins

const almanac: SunTimes = {
  sunrise: UNSET_SUNRISE,
  sunset: UNSET_SUNSET,
}

export const GetAlmanac = (): SunTimes => almanac

const ZERO_TIME = 0
const DEFAULT_SUNRISE_HOUR = 6
const DEFAULT_SUNRISE_MINUTE = 15
const DEFAULT_SUNSET_HOUR = 21
const DEFAULT_SUNSET_MINUTE = 0

function SetAlmanac(weather: WeatherResults): void {
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

const LOCAL_WEATHER_UPDATE_INTERVAL = 1_000
export const LocalWeatherUpdater = new CyclicUpdater(async () => {
  await Functions.FetchWeather('http://localhost:8080/').then((weather) =>
    Functions.ShowWeather(document.querySelector<HTMLElement>('.localweather'), weather),
  )
}, LOCAL_WEATHER_UPDATE_INTERVAL)

const REMOTE_WEATHER_UPDATE_INTERVAL = 60_000
export const WeatherUpdater = new CyclicUpdater(async () => {
  await Functions.FetchWeather('/weather')
    .then((weather) => Functions.ShowWeather(document.querySelector<HTMLElement>('.weather'), weather))
    .then(Functions.SetAlmanac)
}, REMOTE_WEATHER_UPDATE_INTERVAL)
