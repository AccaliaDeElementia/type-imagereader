'use sanity'

import { Router } from 'express'
import type { Application, Request, Response, RequestHandler } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

interface WeatherResults {
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

export class Imports {
  public static get appId (): string {
    return process.env.OPENWEATHER_APPID ?? ''
  }

  public static get location (): string {
    return encodeURIComponent(process.env.OPENWEATHER_LOCATION ?? '')
  }

  public static get nightNotBefore (): number {
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
  }

  public static get nightNotAfter (): number {
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
  }

  public static setInterval = setInterval
  public static fetch = fetch
  public static Router = Router
}

export class Functions {
  public static weather: WeatherResults = {
    temp: undefined,
    pressure: undefined,
    humidity: undefined,
    description: undefined,
    icon: undefined,
    sunrise: undefined,
    sunset: undefined
  }

  public static async GetWeather (): Promise<OpenWeatherData> {
    if (Imports.appId.length < 1) {
      throw new Error('no OpewnWeather AppId Defined!')
    }
    if (Imports.location.length < 1) {
      throw new Error('no OpewnWeather Location Defined!')
    }
    const response = await Imports.fetch(`https://api.openweathermap.org/data/2.5/weather?q=${Imports.location}&appid=${Imports.appId}`)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- TODO: make this truely typesafe?
    return await response.json() as unknown as OpenWeatherData
  }

  public static async UpdateWeather (): Promise<WeatherResults> {
    const weather = Functions.weather
    try {
      const data = await Functions.GetWeather()
      if (data.main != null) {
        weather.temp = data.main.temp - 273.15
        weather.pressure = data.main.pressure
        weather.humidity = data.main.humidity
      }
      weather.description = data.weather[0]?.main
      weather.icon = data.weather[0]?.icon
      weather.sunrise = Math.min(1000 * data.sys.sunrise, Imports.nightNotAfter)
      weather.sunset = Math.max(1000 * data.sys.sunset, Imports.nightNotBefore)
    } catch (_) {
      weather.temp = undefined
      weather.pressure = undefined
      weather.humidity = undefined
      weather.description = undefined
      weather.icon = undefined
      weather.sunrise = Imports.nightNotAfter
      weather.sunset = Imports.nightNotBefore
    }
    return weather
  }
}

// Export the base-router
export async function getRouter (_app: Application, _server: Server, _sockets: WebSocketServer): Promise<Router> {
  const router = Imports.Router()

  const handleErrors = (action: (req: Request, res: Response) => Promise<void>): RequestHandler => async (req: Request, res: Response) => {
    try {
      await action(req, res)
    } catch (e) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error'
        }
      })
    }
  }

  router.get('/', handleErrors(async (_, res) => {
    res.status(StatusCodes.OK).json(Functions.weather)
    await Promise.resolve()
  }))

  Imports.setInterval(() => { Functions.UpdateWeather().catch(() => null) }, 10 * 60 * 1000)
  Functions.UpdateWeather().catch(() => null)

  await Promise.resolve()
  return router
}
