import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import path from 'path'
import helmet from 'helmet'

import express, { Request, Response, NextFunction } from 'express'
import StatusCodes from 'http-status-codes'
import 'express-async-errors'

import { getRouter as getApiRouter } from './routes/api'
import { getRouter as getImagesRouter } from './routes/images'
import { getRouter as getRootRouter } from './routes/index'

import sassMiddleware from 'node-sass-middleware'

const app = express();

(async () => {
  const { BAD_REQUEST } = StatusCodes
  /************************************************************************************
   *                              Set basic express settings
   ***********************************************************************************/

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  // Show routes called in console during development
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
  }

  // Security
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet())
  }

  // Add APIs
  app.use('/', await getRootRouter())
  app.use('/api', await getApiRouter())
  app.use('/images', await getImagesRouter())

  // Print API errors
  app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
    console.log(res)
    return res.status(BAD_REQUEST).json({
      error: err.message
    })
  })

  /************************************************************************************
   *                              Serve front-end content
   ***********************************************************************************/
  app.set('views', path.join(__dirname, 'views'))
  app.set('view engine', 'pug')
  app.use(sassMiddleware({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true, // true = .sass and false = .scss
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
})()

// Export express instance
export default app
