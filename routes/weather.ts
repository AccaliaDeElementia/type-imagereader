'use sanity'

import { Router } from 'express'
import type { Application, Request, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { StatusCodes } from 'http-status-codes'

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

function isMainValid(data: object): boolean {
  if ('main' in data) {
    if (typeof data.main !== 'object' || data.main == null) return false
    if (!('temp' in data.main) || typeof data.main.temp !== 'number') return false
    if (!('pressure' in data.main) || typeof data.main.pressure !== 'number') return false
    if (!('humidity' in data.main) || typeof data.main.humidity !== 'number') return false
  }
  return true
}

function isWeatherValid(data: object): boolean {
  if (!('weather' in data) || !(data.weather instanceof Array)) return false
  for (const record of data.weather as unknown[]) {
    if (typeof record !== 'object' || record == null) return false
    if (!('main' in record) || typeof record.main !== 'string') return false
    if (!('icon' in record) || typeof record.icon !== 'string') return false
  }
  return true
}

function isSysValid(data: object): boolean {
  if (!('sys' in data) || typeof data.sys !== 'object' || data.sys == null) return false
  if (!('sunrise' in data.sys) || typeof data.sys.sunrise !== 'number') return false
  if (!('sunset' in data.sys) || typeof data.sys.sunset !== 'number') return false
  return true
}

export const Imports = {
  getNightNotBefore: (): number => {
    const time = new Date()
    time.setMilliseconds(0)
    time.setSeconds(0)
    time.setMinutes(0)
    time.setHours(21)
    const env = (process.env.NIGHT_NOT_BEFORE ?? '').split(':')
    if (env[0] !== undefined && env[0] !== '') {
      const hour = +env[0]
      const minute = +(env[1] ?? '0')
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        time.setMinutes(minute)
        time.setHours(hour)
      }
    }
    return time.getTime()
  },
  getNightNotAfter: (): number => {
    const time = new Date()
    time.setMilliseconds(0)
    time.setSeconds(0)
    time.setMinutes(15)
    time.setHours(6)
    const env = (process.env.NIGHT_NOT_AFTER ?? '').split(':')
    if (env[0] !== undefined && env[0] !== '') {
      const hour = +env[0]
      const minute = +(env[1] ?? '0')
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        time.setMinutes(minute)
        time.setHours(hour)
      }
    }
    return time.getTime()
  },
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
    if (typeof data !== 'object' || data == null) return false
    if (!isMainValid(data)) return false
    if (!isWeatherValid(data)) return false
    return isSysValid(data)
  },
  GetWeather: async (): Promise<OpenWeatherData> => {
    const appId = process.env.OPENWEATHER_APPID ?? ''
    if (appId.length < 1) throw new Error('no OpewnWeather AppId Defined!')
    const location = encodeURIComponent(process.env.OPENWEATHER_LOCATION ?? '')
    if (location.length < 1) throw new Error('no OpewnWeather Location Defined!')
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${appId}`)
    const data: unknown = await response.json()
    if (!Functions.isOpenWeatherData(data)) throw new Error('Invalid JSON returned from Open Weather Map')
    return data
  },
  UpdateWeather: async (): Promise<WeatherResults> => {
    const weather = Functions.weather
    const nightNotAfter = Imports.getNightNotAfter()
    const nightNotBefore = Imports.getNightNotBefore()
    try {
      const data = await Functions.GetWeather()
      if (data.main != null) {
        weather.temp = data.main.temp - 273.15
        weather.pressure = data.main.pressure
        weather.humidity = data.main.humidity
      }
      weather.description = data.weather[0]?.main
      weather.icon = data.weather[0]?.icon
      weather.sunrise = Math.min(1000 * data.sys.sunrise, nightNotAfter)
      weather.sunset = Math.max(1000 * data.sys.sunset, nightNotBefore)
    } catch (_) {
      weather.temp = undefined
      weather.pressure = undefined
      weather.humidity = undefined
      weather.description = undefined
      weather.icon = undefined
      weather.sunrise = nightNotAfter
      weather.sunset = nightNotBefore
    }
    return weather
  },
}

// Export the base-router
export async function getRouter(_app: Application, _server: Server, _sockets: WebSocketServer): Promise<Router> {
  const router = Imports.Router()

  router.get('/', (_: Request, res: Response): void => {
    res.status(StatusCodes.OK).json(Functions.weather)
  })

  setInterval(
    () => {
      void Functions.UpdateWeather()
    },
    10 * 60 * 1000,
  )
  void Functions.UpdateWeather()

  await Promise.resolve()
  return router
}
