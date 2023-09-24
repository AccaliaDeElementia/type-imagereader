import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { StatusCodes } from 'http-status-codes'

interface WeatherResults {
  temp: number|undefined
  pressure: number|undefined
  humidity: number|undefined
  description: string|undefined
  icon: string|undefined
  sunrise: number|undefined
  sunset: number|undefined
}

export interface OpenWeatherData {
  main: {
    temp: number
    pressure: number
    humidity: number
  }
  weather: {
    main: string
    icon: string
  }[]
  sys: {
    sunrise: number
    sunset: number
  }
}

export class Imports {
  public static get appId (): string {
    return process.env.OPENWEATHER_APPID || ''
  }

  public static get location (): string {
    return encodeURIComponent(process.env.OPENWEATHER_LOCATION || '')
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
    if (!Imports.appId) {
      throw new Error('no OpewnWeather AppId Defined!')
    }
    if (!Imports.location) {
      throw new Error('no OpewnWeather Location Defined!')
    }
    const response = await Imports.fetch(`https://api.openweathermap.org/data/2.5/weather?q=${Imports.location}&appid=${Imports.appId}`)
    return await response.json()
  }

  public static async UpdateWeather (): Promise<WeatherResults> {
    const weather = Functions.weather
    try {
      const data = await Functions.GetWeather()
      if (data && data.main) {
        weather.temp = data.main.temp - 273.15
        weather.pressure = data.main.pressure
        weather.humidity = data.main.humidity
      }
      weather.description = (data.weather[0] || {}).main
      weather.icon = (data.weather[0] || {}).icon
      weather.sunrise = 1000 * data.sys.sunrise
      weather.sunset = 1000 * data.sys.sunset
    } catch (_) {
      weather.temp = undefined
      weather.pressure = undefined
      weather.humidity = undefined
      weather.description = undefined
      weather.icon = undefined
      weather.sunrise = undefined
      weather.sunset = undefined
    }
    return weather
  }
}

// Export the base-router
export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
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
  }))

  Imports.setInterval(Functions.UpdateWeather, 10 * 60 * 1000)
  Functions.UpdateWeather()

  return router
}
