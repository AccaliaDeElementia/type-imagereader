import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import path from 'path'
import helmet from 'helmet'

import express, { Request, Response, NextFunction } from 'express'
import StatusCodes from 'http-status-codes'
import 'express-async-errors'
import { Server as WebSocketServer } from 'socket.io'

import { getRouter as getApiRouter } from './routes/api'
import { getRouter as getImagesRouter } from './routes/images'
import { getRouter as getRootRouter } from './routes/index'
import { getRouter as getSlideshowRouter } from './routes/slideshow'
import { getRouter as getWeatherRouter } from './routes/weather'

import sassMiddleware from 'node-sass-middleware'

export default async function start (port: number) {
  const app = express()
  const server = app.listen(port, () => {})
  const websockets = new WebSocketServer(server)

  const { BAD_REQUEST } = StatusCodes

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(helmet())
  }

  app.use('/', await getRootRouter(app, server, websockets))
  app.use('/api', await getApiRouter(app, server, websockets))
  app.use('/images', await getImagesRouter(app, server, websockets))
  app.use('/slideshow', await getSlideshowRouter(app, server, websockets))
  app.use('/weather', await getWeatherRouter(app, server, websockets))

  app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
    console.log(res)
    return res.status(BAD_REQUEST).json({
      error: err.message
    })
  })

  app.set('views', path.join(__dirname, 'views'))
  app.set('view engine', 'pug')
  app.use(sassMiddleware({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true,
    outputStyle: 'compressed',
    sourceMap: true
  }))
  app.get('/*', (_, res, next) => {
    res.set('X-Clacks-Overhead', 'GNU Terry Pratchett')
    next()
  })
  const viewsDir = path.join(__dirname, 'views')
  app.set('views', viewsDir)
  const staticDir = path.join(__dirname, 'public')
  app.use(express.static(staticDir))

  return { app, server }
}
