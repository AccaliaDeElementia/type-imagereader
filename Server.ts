'use sanity'

import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { join } from 'node:path'
import helmet from 'helmet'

import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import favicon from 'serve-favicon'
import StatusCodes from 'http-status-codes'
import 'express-async-errors'

import type { Server as HttpServer } from 'node:http'
import { Server as WebSocketServer } from 'socket.io'

import { getRouter as getApiRouter } from './routes/api'
import { getRouter as getImagesRouter } from './routes/images'
import { getRouter as getRootRouter } from './routes/index'
import { getRouter as getSlideshowRouter } from './routes/slideshow'
import { getRouter as getWeatherRouter } from './routes/weather'

import sassMiddleware from './utils/sass-middleware'
import browserifyMiddleware from './utils/browserify-middleware'

import { Debouncer } from './utils/debounce'

export const Imports = {
  dirname: __dirname,
  express,
  cookieParser,
  favicon,
  morgan,
  helmet,
  sassMiddleware,
  browserifyMiddleware,
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
  CreateApp: (port: number): [Express, HttpServer, WebSocketServer] => {
    const app = Imports.express()
    const server = app.listen(port, () => null)
    const websockets = new Imports.WebSocketServer(server)
    return [app, server, websockets]
  },
  ConfigureBaseApp: (app: Express): void => {
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(Imports.cookieParser())
    app.use(Imports.favicon(join(__dirname, 'public', 'images', 'favicon.ico')))
  },
  ConfigureLoggingAndErrors: (app: Express): void => {
    switch (process.env.NODE_ENV) {
      case 'production':
        app.use(Imports.helmet())
        break
      case 'development':
        app.use(Imports.morgan('dev'))
        break
      default:
        break
    }

    app.use((err: Error, _: Request, res: Response, __: NextFunction) =>
      res.status(StatusCodes.BAD_REQUEST).json({ error: err.message }),
    )
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

    const sassMiddleware = Imports.sassMiddleware({
      mountPath: join(__dirname, 'public'),
      watchdir: '/stylesheets',
    })
    app.use((req, res, next) => {
      sassMiddleware(req, res, next).catch(() => {
        next()
      })
    })
    const browserifyMiddleware = Imports.browserifyMiddleware({
      basePath: join(__dirname, 'public'),
      watchPaths: ['/scripts', '/bundles'],
    })
    app.use((req, res, next) => {
      browserifyMiddleware(req, res, next).catch(() => {
        next()
      })
    })
    app.use(express.static(join(__dirname, 'public')))
  },
}

export default async function start(port: number): Promise<{ app: Express; server: HttpServer }> {
  const [app, server, websockets] = Functions.CreateApp(port)

  Functions.ConfigureBaseApp(app)
  await Functions.RegisterRouters(app, server, websockets)
  Functions.ConfigureLoggingAndErrors(app)
  Functions.RegisterViewsAndMiddleware(app)

  app.get('/*', (_, res, next) => {
    res.set('X-Clacks-Overhead', 'GNU Terry Pratchett')
    next()
  })

  Debouncer.startTimers()

  return { app, server }
}
