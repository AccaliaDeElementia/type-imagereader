'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'
import debug from 'debug'
import { StringishHasValue } from '#utils/helpers.js'

const KELVIN_TO_CELCIUS_OFFSET = -273.15
const SECONDS_TO_MILLISECONDS_MULTIPLE = 1000
const UPDATE_INTERVAL = 600_000 // Ten Minutes in Milliseconds
const FETCH_TIMEOUT_MS = 60_000 // standard "long-but-bounded" web request timeout

export interface WeatherResults {
  temp: number | undefined
  pressure: number | undefined
  humidity: number | undefined
  description: string | undefined
  icon: string | undefined
  sunrise: number | undefined
  sunset: number | undefined
}

export interface OpenWeatherData {
  main?: {
    temp: number
    pressure: number
    humidity: number
  }
  weather: Array<{
    main: string
    icon: string
  }>
  sys: {
    sunrise: number
    sunset: number
  }
}

export class WeatherConfigError extends Error {}

function isOptionalMainValid(data: object): boolean {
  if ('main' in data) {
    if (typeof data.main !== 'object' || data.main === null) return false
    if (!('temp' in data.main) || typeof data.main.temp !== 'number') return false
    if (!('pressure' in data.main) || typeof data.main.pressure !== 'number') return false
    if (!('humidity' in data.main) || typeof data.main.humidity !== 'number') return false
  }
  return true
}

function isWeatherValid(data: object): boolean {
  if (!('weather' in data) || !(data.weather instanceof Array)) return false
  for (const record of data.weather as unknown[]) {
    if (typeof record !== 'object' || record === null) return false
    if (!('main' in record) || typeof record.main !== 'string') return false
    if (!('icon' in record) || typeof record.icon !== 'string') return false
  }
  return true
}

function isSysValid(data: object): boolean {
  if (!('sys' in data) || typeof data.sys !== 'object' || data.sys === null) return false
  if (!('sunrise' in data.sys) || typeof data.sys.sunrise !== 'number') return false
  if (!('sunset' in data.sys) || typeof data.sys.sunset !== 'number') return false
  return true
}

const DEFAULT_MILLISECONDS = 0
const DEFAULT_SECONDS = 0
const DEFAULT_DAWN_MINUTES = 15
const DEFAULT_DAWN_HOUR = 6
const DEFAULT_DUSK_MINUTES = 0
const DEFAULT_DUSK_HOUR = 21
interface timeCode {
  hour: number
  minute: number
}
const MIN_HOUR = 0
const MAX_HOUR = 23
const MIN_MINUTES = 0
const MAX_MINUTES = 59
function StringToTimeCode(input: string | undefined): timeCode | undefined {
  if (input === undefined) return undefined
  const [iHour, iMinute] = input.split(':')
  if (StringishHasValue(iHour)) {
    const hour = Number.parseInt(iHour, 10)
    let minute = MIN_MINUTES
    if (StringishHasValue(iMinute)) {
      minute = Number.parseInt(iMinute, 10)
    }
    if (hour >= MIN_HOUR && hour <= MAX_HOUR && minute >= MIN_MINUTES && minute <= MAX_MINUTES) {
      return { hour, minute }
    }
  }
  return undefined
}
function getTimeOfDay(envVar: string | undefined, defaultHour: number, defaultMinute: number): number {
  const time = new Date()
  time.setMilliseconds(DEFAULT_MILLISECONDS)
  time.setSeconds(DEFAULT_SECONDS)
  time.setMinutes(defaultMinute)
  time.setHours(defaultHour)
  const code = StringToTimeCode(envVar)
  if (code !== undefined) {
    time.setHours(code.hour)
    time.setMinutes(code.minute)
  }
  return time.getTime()
}
export const Imports = {
  getEarliestSunset: (): number => getTimeOfDay(process.env.NIGHT_NOT_BEFORE, DEFAULT_DUSK_HOUR, DEFAULT_DUSK_MINUTES),
  getLatestSunrise: (): number => getTimeOfDay(process.env.NIGHT_NOT_AFTER, DEFAULT_DAWN_HOUR, DEFAULT_DAWN_MINUTES),
  logger: debug('type-imagereader:weather'),
  Router,
}
const defaultWeather: WeatherResults = {
  temp: undefined,
  pressure: undefined,
  humidity: undefined,
  description: undefined,
  icon: undefined,
  sunrise: undefined,
  sunset: undefined,
}
export const Functions = {
  weather: defaultWeather,
  isOpenWeatherData: (data: unknown): data is OpenWeatherData => {
    if (typeof data !== 'object' || data === null) return false
    if (!isOptionalMainValid(data)) return false
    if (!isWeatherValid(data)) return false
    return isSysValid(data)
  },
  GetWeather: async (): Promise<OpenWeatherData> => {
    const appId = process.env.OPENWEATHER_APPID
    if (!StringishHasValue(appId)) throw new WeatherConfigError('no OpenWeather AppId Defined!')
    const location = encodeURIComponent(process.env.OPENWEATHER_LOCATION ?? '')
    if (!StringishHasValue(location)) throw new WeatherConfigError('no OpenWeather Location Defined!')
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${appId}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const data: unknown = await response.json()
    if (!Functions.isOpenWeatherData(data)) throw new Error('Invalid JSON returned from Open Weather Map')
    return data
  },
  UpdateWeather: async (): Promise<WeatherResults> => {
    const weather = Functions.weather
    const latestSunrise = Imports.getLatestSunrise()
    const earliestSunset = Imports.getEarliestSunset()
    try {
      const data = await Functions.GetWeather()
      if (data.main !== undefined) {
        weather.temp = data.main.temp + KELVIN_TO_CELCIUS_OFFSET
        weather.pressure = data.main.pressure
        weather.humidity = data.main.humidity
      }
      const [firstForecast] = data.weather
      weather.description = firstForecast?.main
      weather.icon = firstForecast?.icon
      weather.sunrise = Math.min(SECONDS_TO_MILLISECONDS_MULTIPLE * data.sys.sunrise, latestSunrise)
      weather.sunset = Math.max(SECONDS_TO_MILLISECONDS_MULTIPLE * data.sys.sunset, earliestSunset)
    } catch (err) {
      if (err instanceof WeatherConfigError) {
        Imports.logger('UpdateWeather skipped: %s', err.message)
      } else {
        Imports.logger('UpdateWeather error', err)
      }
      weather.temp = undefined
      weather.pressure = undefined
      weather.humidity = undefined
      weather.description = undefined
      weather.icon = undefined
      weather.sunrise = latestSunrise
      weather.sunset = earliestSunset
    }
    return weather
  },
}

const findMissingWeatherConfigVar = (): string | undefined => {
  if (!StringishHasValue(process.env.OPENWEATHER_APPID)) return 'OPENWEATHER_APPID'
  if (!StringishHasValue(process.env.OPENWEATHER_LOCATION)) return 'OPENWEATHER_LOCATION'
  return undefined
}

// Export the base-router
export async function getRouter(_app: Application, _server: Server, _sockets: WebSocketServer): Promise<Router> {
  const router = Imports.Router()

  router.get('/', (_: Request, res: Response): void => {
    res.status(StatusCodes.OK).json(Functions.weather)
  })

  const missingVar = findMissingWeatherConfigVar()
  if (missingVar === undefined) {
    setInterval(() => {
      void Functions.UpdateWeather()
    }, UPDATE_INTERVAL)
    void Functions.UpdateWeather()
  } else {
    Imports.logger('weather updates disabled: %s is not configured', missingVar)
  }

  await Promise.resolve() // async required by getRouter signature
  return router
}
