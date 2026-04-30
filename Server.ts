'use sanity'

import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { join } from 'node:path'
import helmet from 'helmet'

import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import favicon from 'serve-favicon'
import StatusCodes from 'http-status-codes'

import { createServer, type Server as HttpServer } from 'node:http'
import { Server as WebSocketServer } from 'socket.io'

import { getRouter as getApiRouter } from './routes/api'
import { getRouter as getImagesRouter } from './routes/images'
import { getRouter as getRootRouter } from './routes/index'
import { getRouter as getSlideshowRouter } from './routes/slideshow'
import { getRouter as getWeatherRouter } from './routes/weather'

import debug from 'debug'

export const Imports = {
  dirname: __dirname,
  logger: debug('type-imagereader:Server'),
  express,
  createServer,
  cookieParser,
  favicon,
  morgan,
  helmet,
  WebSocketServer,
}

export const Routers = {
  Root: getRootRouter,
  Api: getApiRouter,
  Images: getImagesRouter,
  Slideshow: getSlideshowRouter,
  Weather: getWeatherRouter,
}

export const Functions = {
  CreateApp: (): [Express, HttpServer, WebSocketServer] => {
    const app = Imports.express()
    const server = Imports.createServer((req, res) => {
      app(req, res)
    })
    const websockets = new Imports.WebSocketServer(server)
    return [app, server, websockets]
  },
  ListenOnPort: (server: HttpServer, port: number): void => {
    server.listen(port, (err?: Error) => {
      if (err !== undefined) {
        Imports.logger('Error encountered creating server')
        Imports.logger(err)
      }
    })
  },
  ConfigureBaseApp: (app: Express): void => {
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(Imports.cookieParser())
    const faviconPath = join(__dirname, 'dist', 'images', 'favicon.ico')
    try {
      app.use(Imports.favicon(faviconPath))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      Imports.logger('favicon middleware skipped: %s', message)
    }
  },
  ConfigureLogging: (app: Express): void => {
    switch (process.env.NODE_ENV) {
      case 'production':
        app.use(
          Imports.helmet({
            // Slideshow weather icons are served from openweathermap.org; default img-src ('self' data:) blocks them.
            contentSecurityPolicy: {
              directives: {
                'img-src': ["'self'", 'data:', 'https://openweathermap.org'],
              },
            },
          }),
        )
        break
      case 'development':
        app.use(Imports.morgan('dev'))
        break
      default:
        break
    }
  },
  ConfigureErrorHandler: (app: Express): void => {
    app.use((err: Error, _: Request, res: Response, __: NextFunction) =>
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err.message }),
    )
  },
  SetClacksOverhead: (_: Request, res: Response, next: NextFunction): void => {
    res.set('X-Clacks-Overhead', 'GNU Terry Pratchett')
    next()
  },
  RegisterRouters: async (app: Express, server: HttpServer, websockets: WebSocketServer): Promise<void> => {
    app.use('/', await Routers.Root(app, server, websockets))
    app.use('/api', await Routers.Api(app, server, websockets))
    app.use('/images', await Routers.Images(app, server, websockets))
    app.use('/slideshow', await Routers.Slideshow(app, server, websockets))
    app.use('/weather', await Routers.Weather(app, server, websockets))
  },
  RegisterViewsAndMiddleware: (app: Express): void => {
    app.set('views', join(__dirname, 'views'))
    app.set('view engine', 'pug')

    app.use(express.static(join(__dirname, 'dist')))
  },
}

export default async function start(port: number): Promise<{ app: Express; server: HttpServer }> {
  const [app, server, websockets] = Functions.CreateApp()

  Functions.ConfigureBaseApp(app)
  Functions.ConfigureLogging(app) // helmet/morgan must run before routers so headers/logs apply to handled responses
  app.use(Functions.SetClacksOverhead) // header on every response, not just 404s
  Functions.RegisterViewsAndMiddleware(app)
  await Functions.RegisterRouters(app, server, websockets)
  Functions.ConfigureErrorHandler(app) // Express error-handling middleware must be registered last

  Functions.ListenOnPort(server, port)

  return { app, server }
}
