import { Application, Router, Request, Response, RequestHandler } from 'express'
import { Server as WebSocketServer } from 'socket.io'
import { Server } from 'http'
import { request as WebRequest } from 'https'
import { INTERNAL_SERVER_ERROR, OK } from 'http-status-codes'

const debug = require('debug')

const appid = process.env.OPENWEATHER_APPID
const location = encodeURIComponent(process.env.OPENWEATHER_LOCATION || 'London, UK')

interface WeatherResults {
  temp: number|undefined
  pressure: number|undefined
  humidity: number|undefined
  description: string|undefined
  icon: string|undefined
  sunrise: number|undefined
  sunset: number|undefined
}

interface OpenWeatherData {
  main: {
    temp: number
    pressure: number
    humidity: number
  }
  weather: [
    {
      main: string
      icon: string
    }
  ],
  sys: {
    sunrise: number
    sunset: number
  }
}

const getWeather = ():Promise<OpenWeatherData> => new Promise((resolve, reject) => {
  if (!appid) {
    return reject(new Error('no Openweather AppId Defined'))
  }
  let data = ''
  const req = WebRequest(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${appid}`, (res) => {
    res.on('data', (d) => {
      data += d
    })
    res.on('end', () => {
      resolve(JSON.parse(data))
    })
  })

  req.on('error', (e) => {
    console.error(e)
    reject(e)
  })
  req.end()
})

const weather:WeatherResults = {
  temp: undefined,
  pressure: undefined,
  humidity: undefined,
  description: undefined,
  icon: undefined,
  sunrise: undefined,
  sunset: undefined
}
const updateWeather = () => getWeather()
  .then(data => {
    if (data && data.main) {
      weather.temp = data.main.temp - 273.15
      weather.pressure = data.main.pressure
      weather.humidity = data.main.humidity
    }
    weather.description = (data.weather[0] || {}).main
    weather.icon = (data.weather[0] || {}).icon
    weather.sunrise = 1000 * data.sys.sunrise
    weather.sunset = 1000 * data.sys.sunset
    return weather
  }, () => {
    weather.temp = undefined
    weather.pressure = undefined
    weather.humidity = undefined
    weather.description = undefined
    weather.icon = undefined
    weather.sunrise = undefined
    weather.sunset = undefined
    return weather
  })

// Export the base-router
export async function getRouter (_: Application, __: Server, ___: WebSocketServer) {
  const router = Router()

  const logger = debug('type-imagereader:api')

  const handleErrors = (action: (req: Request, res: Response) => Promise<void>): RequestHandler => async (req: Request, res: Response) => {
    try {
      await action(req, res)
    } catch (e) {
      logger(`Error rendering: ${req.originalUrl}`, req.body)
      logger(e)
      res.status(INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'EINTERNALERROR',
          message: 'Internal Server Error'
        }
      })
    }
  }

  router.get('/', handleErrors(async (_, res) => {
    res.status(OK).json(weather)
  }))

  setInterval(updateWeather, 10 * 60 * 1000)
  updateWeather()

  return router
}
