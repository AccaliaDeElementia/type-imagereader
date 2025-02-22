'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import type { Express, NextFunction } from 'express'
import express from 'express'
import morgan from 'morgan'
import type { Server as HttpServer } from 'http'
import type { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'

import { Debouncer } from '../utils/debounce'
import { getRouter as getApiRouter } from '../routes/api'
import { getRouter as getImagesRouter } from '../routes/images'
import { getRouter as getRootRouter } from '../routes/index'
import { getRouter as getSlideshowRouter } from '../routes/slideshow'
import { getRouter as getWeatherRouter } from '../routes/weather'

import start, { Functions, Routers, Imports } from '../Server'
import assert from 'assert'
import { Cast } from './testutils/TypeGuards'

@suite
export class ServerCreateAppTests {
  HttpServerInstanceFake = Cast<HttpServer>({ http: Math.random() })
  WebSocketServerInstanceFake = Cast<WebSocketServer>({ socketio: Math.random() })

  ExpressStub?: Sinon.SinonStub
  ExpressInstanceStub = {
    listen: sinon.stub().returns(this.HttpServerInstanceFake),
  }

  WebSocketServerStub?: Sinon.SinonStub

  before(): void {
    this.ExpressStub = sinon.stub(Imports, 'express').returns(Cast<Express>(this.ExpressInstanceStub))
    this.WebSocketServerStub = sinon.stub(Imports, 'WebSocketServer').returns(this.WebSocketServerInstanceFake)
  }

  after(): void {
    this.ExpressStub?.restore()
    this.WebSocketServerStub?.restore()
  }

  @test
  'it should construct Express object'(): void {
    const [express] = Functions.CreateApp(8080)
    expect(this.ExpressStub?.callCount).to.equal(1)
    expect(this.ExpressStub?.firstCall.args).to.deep.equal([])
    expect(express).to.equal(this.ExpressInstanceStub)
  }

  @test
  'it should create HttpServer on expected port'(): void {
    const [, server] = Functions.CreateApp(65535)
    expect(this.ExpressInstanceStub.listen.callCount).to.equal(1)
    expect(this.ExpressInstanceStub.listen.firstCall.args).to.have.lengthOf(2)
    expect(this.ExpressInstanceStub.listen.firstCall.args[0]).to.equal(65535)
    expect(this.ExpressInstanceStub.listen.firstCall.args[1]).to.be.a('function')
    Cast<() => void>(this.ExpressInstanceStub.listen.firstCall.args[1])()
    expect(server).to.equal(this.HttpServerInstanceFake)
  }

  @test
  'it should create WebSocketServer using HttpServer as base'(): void {
    const [, , websockets] = Functions.CreateApp(8080)
    expect(this.WebSocketServerStub?.callCount).to.equal(1)
    expect(this.WebSocketServerStub?.calledWithNew()).to.equal(true)
    expect(this.WebSocketServerStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.WebSocketServerStub?.firstCall.args[0]).to.equal(this.HttpServerInstanceFake)
    expect(websockets).to.equal(this.WebSocketServerInstanceFake)
  }
}

@suite
export class ServerRoutersImportTests {
  @test
  'it should include root router creator'(): void {
    expect(Routers.Root).to.equal(getRootRouter)
  }

  @test
  'it should include api router creator'(): void {
    expect(Routers.Api).to.equal(getApiRouter)
  }

  @test
  'it should include image router creator'(): void {
    expect(Routers.Images).to.equal(getImagesRouter)
  }

  @test
  'it should include slideshow router creator'(): void {
    expect(Routers.Slideshow).to.equal(getSlideshowRouter)
  }

  @test
  'it should include weather router creator'(): void {
    expect(Routers.Weather).to.equal(getWeatherRouter)
  }
}

@suite
export class ServerRegisterRoutersTests {
  AppStub = {
    use: sinon.stub(),
  }

  AppFake = Cast<Express>(this.AppStub)
  ServerFake = Cast<HttpServer>({ webserver: Math.random() })
  WebSocketsFake = Cast<WebSocketServer>({ websockets: Math.random() })

  RootRouteStub?: Sinon.SinonStub
  ApiRouteStub?: Sinon.SinonStub
  ImagesRouteStub?: Sinon.SinonStub
  SlideshowRouteStub?: Sinon.SinonStub
  WeatherRouteStub?: Sinon.SinonStub

  before(): void {
    this.RootRouteStub = sinon.stub(Routers, 'Root').resolves()
    this.ApiRouteStub = sinon.stub(Routers, 'Api').resolves()
    this.ImagesRouteStub = sinon.stub(Routers, 'Images').resolves()
    this.SlideshowRouteStub = sinon.stub(Routers, 'Slideshow').resolves()
    this.WeatherRouteStub = sinon.stub(Routers, 'Weather').resolves()
  }

  after(): void {
    this.RootRouteStub?.restore()
    this.ApiRouteStub?.restore()
    this.ImagesRouteStub?.restore()
    this.SlideshowRouteStub?.restore()
    this.WeatherRouteStub?.restore()
  }

  @test
  async 'it should register all five routes'(): Promise<void> {
    await Functions.RegisterRouters(this.AppFake, this.ServerFake, this.WebSocketsFake)
  }

  @test
  async 'it should register / route'(): Promise<void> {
    const route = { route: Math.random() }
    this.RootRouteStub?.resolves(route)
    await Functions.RegisterRouters(this.AppFake, this.ServerFake, this.WebSocketsFake)
    expect(this.RootRouteStub?.callCount).to.equal(1)
    expect(this.RootRouteStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.RootRouteStub?.firstCall.args[0]).to.equal(this.AppFake)
    expect(this.RootRouteStub?.firstCall.args[1]).to.equal(this.ServerFake)
    expect(this.RootRouteStub?.firstCall.args[2]).to.equal(this.WebSocketsFake)
    expect(this.AppStub.use.getCall(0).args).to.have.lengthOf(2)
    expect(this.AppStub.use.getCall(0).args[0]).to.equal('/')
    expect(this.AppStub.use.getCall(0).args[1]).to.equal(route)
  }

  @test
  async 'it should register /api route'(): Promise<void> {
    const route = { route: Math.random() }
    this.ApiRouteStub?.resolves(route)
    await Functions.RegisterRouters(this.AppFake, this.ServerFake, this.WebSocketsFake)
    expect(this.ApiRouteStub?.callCount).to.equal(1)
    expect(this.ApiRouteStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.ApiRouteStub?.firstCall.args[0]).to.equal(this.AppFake)
    expect(this.ApiRouteStub?.firstCall.args[1]).to.equal(this.ServerFake)
    expect(this.ApiRouteStub?.firstCall.args[2]).to.equal(this.WebSocketsFake)
    expect(this.AppStub.use.getCall(1).args).to.have.lengthOf(2)
    expect(this.AppStub.use.getCall(1).args[0]).to.equal('/api')
    expect(this.AppStub.use.getCall(1).args[1]).to.equal(route)
  }

  @test
  async 'it should register /images route'(): Promise<void> {
    const route = { route: Math.random() }
    this.ImagesRouteStub?.resolves(route)
    await Functions.RegisterRouters(this.AppFake, this.ServerFake, this.WebSocketsFake)
    expect(this.ImagesRouteStub?.callCount).to.equal(1)
    expect(this.ImagesRouteStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.ImagesRouteStub?.firstCall.args[0]).to.equal(this.AppFake)
    expect(this.ImagesRouteStub?.firstCall.args[1]).to.equal(this.ServerFake)
    expect(this.ImagesRouteStub?.firstCall.args[2]).to.equal(this.WebSocketsFake)
    expect(this.AppStub.use.getCall(2).args).to.have.lengthOf(2)
    expect(this.AppStub.use.getCall(2).args[0]).to.equal('/images')
    expect(this.AppStub.use.getCall(2).args[1]).to.equal(route)
  }

  @test
  async 'it should register /slkideshow route'(): Promise<void> {
    const route = { route: Math.random() }
    this.SlideshowRouteStub?.resolves(route)
    await Functions.RegisterRouters(this.AppFake, this.ServerFake, this.WebSocketsFake)
    expect(this.SlideshowRouteStub?.callCount).to.equal(1)
    expect(this.SlideshowRouteStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.SlideshowRouteStub?.firstCall.args[0]).to.equal(this.AppFake)
    expect(this.SlideshowRouteStub?.firstCall.args[1]).to.equal(this.ServerFake)
    expect(this.SlideshowRouteStub?.firstCall.args[2]).to.equal(this.WebSocketsFake)
    expect(this.AppStub.use.getCall(3).args).to.have.lengthOf(2)
    expect(this.AppStub.use.getCall(3).args[0]).to.equal('/slideshow')
    expect(this.AppStub.use.getCall(3).args[1]).to.equal(route)
  }

  @test
  async 'it should register /weather route'(): Promise<void> {
    const route = { route: Math.random() }
    this.WeatherRouteStub?.resolves(route)
    await Functions.RegisterRouters(this.AppFake, this.ServerFake, this.WebSocketsFake)
    expect(this.WeatherRouteStub?.callCount).to.equal(1)
    expect(this.WeatherRouteStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.WeatherRouteStub?.firstCall.args[0]).to.equal(this.AppFake)
    expect(this.WeatherRouteStub?.firstCall.args[1]).to.equal(this.ServerFake)
    expect(this.WeatherRouteStub?.firstCall.args[2]).to.equal(this.WebSocketsFake)
    expect(this.AppStub.use.getCall(4).args).to.have.lengthOf(2)
    expect(this.AppStub.use.getCall(4).args[0]).to.equal('/weather')
    expect(this.AppStub.use.getCall(4).args[1]).to.equal(route)
  }
}

@suite
export class ServerConfigureLoggingAndErrorsTests {
  AppStub = {
    use: sinon.stub(),
  }

  AppFake = Cast<Express>(this.AppStub)

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
  }

  MorganOrig: typeof morgan = morgan
  MorganStub?: Sinon.SinonStub
  HelmetStub?: Sinon.SinonStub

  before(): void {
    // Save and replace as stubbing causes unwanted deprication warning due to how the stub replaces part of morgan
    this.MorganOrig = Imports.morgan
    this.MorganStub = sinon.stub()
    Imports.morgan = Cast<typeof morgan>(this.MorganStub)
    this.HelmetStub = sinon.stub(Imports, 'helmet')
    delete process.env.NODE_ENV
  }

  after(): void {
    this.HelmetStub?.restore()
    Imports.morgan = this.MorganOrig
  }

  @test
  'it should add morgan for development NODE_ENV'(): void {
    process.env.NODE_ENV = 'development'
    const morgan = { morgan: Math.random() }
    this.MorganStub?.returns(morgan)
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.MorganStub?.callCount).to.equal(1)
    expect(this.MorganStub?.firstCall.args).to.deep.equal(['dev'])
    expect(this.AppStub.use.calledWith(morgan)).to.equal(true)
  }

  @test
  'it should not add helmet for development NODE_ENV'(): void {
    process.env.NODE_ENV = 'development'
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.HelmetStub?.callCount).to.equal(0)
  }

  @test
  'it should not add morgan for production NODE_ENV'(): void {
    process.env.NODE_ENV = 'production'
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.MorganStub?.callCount).to.equal(0)
  }

  @test
  'it should add helmet for production NODE_ENV'(): void {
    process.env.NODE_ENV = 'production'
    const helmet = { helmet: Math.random() }
    this.HelmetStub?.returns(helmet)
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.HelmetStub?.callCount).to.equal(1)
    expect(this.HelmetStub?.firstCall.args).to.deep.equal([])
    expect(this.AppStub.use.calledWith(helmet)).to.equal(true)
  }

  @test
  'it should not add morgan for funny NODE_ENV'(): void {
    process.env.NODE_ENV = 'funny'
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.MorganStub?.callCount).to.equal(0)
  }

  @test
  'it should not add helmet for funny NODE_ENV'(): void {
    process.env.NODE_ENV = 'funny'
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.HelmetStub?.callCount).to.equal(0)
  }

  @test
  'it should not add morgan for unset NODE_ENV'(): void {
    delete process.env.NODE_ENV
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.MorganStub?.callCount).to.equal(0)
  }

  @test
  'it should not add helmet for unset NODE_ENV'(): void {
    delete process.env.NODE_ENV
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    expect(this.HelmetStub?.callCount).to.equal(0)
  }

  @test
  'it should add error handler'(): void {
    Functions.ConfigureLoggingAndErrors(this.AppFake)
    const handler = Cast(
      this.AppStub.use.lastCall.args[0],
      (o: unknown): o is (a: unknown, b: unknown, c: unknown, d: unknown) => void => typeof o === 'function',
    )
    expect(handler).to.be.a('function')
    const err = new Error('FOO! AN ERROR!')
    handler(err, undefined, this.ResponseStub, undefined)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{ error: 'FOO! AN ERROR!' }])
  }
}

@suite
export class ServerRegisterViewsAndMiddleware {
  SassMiddlewareStub?: Sinon.SinonStub
  BrowerifyMiddlewareStub?: Sinon.SinonStub
  StaticServeStub?: Sinon.SinonStub

  AppStub = {
    use: sinon.stub(),
    set: sinon.stub(),
  }

  AppFake = Cast<Express>(this.AppStub)

  before(): void {
    this.SassMiddlewareStub = sinon.stub(Imports, 'sassMiddleware')
    this.BrowerifyMiddlewareStub = sinon.stub(Imports, 'browserifyMiddleware')
    this.StaticServeStub = sinon.stub(express, 'static')
  }

  after(): void {
    this.SassMiddlewareStub?.restore()
    this.BrowerifyMiddlewareStub?.restore()
    this.StaticServeStub?.restore()
  }

  @test
  'it should set the views directory'(): void {
    Functions.RegisterViewsAndMiddleware(this.AppFake)
    expect(this.AppStub.set.calledWith('views', Imports.dirname + '/views')).to.equal(true)
  }

  @test
  'it should set the view engine'(): void {
    Functions.RegisterViewsAndMiddleware(this.AppFake)
    expect(this.AppStub.set.calledWith('view engine', 'pug')).to.equal(true)
  }

  @test
  'it should configure SassMiddleware'(): void {
    const sass = sinon.stub().resolves()
    this.SassMiddlewareStub?.returns(sass)
    Functions.RegisterViewsAndMiddleware(this.AppFake)
    const fn = Cast<((req: Request, res: Response, next: NextFunction) => void) | undefined>(
      this.AppStub.use.firstCall.args[0],
    )
    assert(fn !== undefined)
    const req = Cast<Request>({})
    const res = Cast<Response>({})
    const next = Cast<NextFunction>({})
    fn(req, res, next)
    expect(sass.calledWithExactly(req, res, next)).to.equal(true)
    expect(this.SassMiddlewareStub?.callCount).to.equal(1)
    expect(this.SassMiddlewareStub?.firstCall.args).to.deep.equal([
      {
        mountPath: Imports.dirname + '/public',
        watchdir: '/stylesheets',
      },
    ])
  }

  @test
  async 'it should call next middelware when SassMiddleware rejects'(): Promise<void> {
    const sass = sinon.stub().rejects(new Error('FOO!'))
    this.SassMiddlewareStub?.returns(sass)
    Functions.RegisterViewsAndMiddleware(this.AppFake)
    const fn = Cast<((req: Request, res: Response, next: NextFunction) => void) | undefined>(
      this.AppStub.use.firstCall.args[0],
    )
    assert(fn !== undefined)
    const req = Cast<Request>({})
    const res = Cast<Response>({})
    const next = sinon.stub()
    fn(req, res, Cast<NextFunction>(next))
    await Promise.resolve()
    expect(sass.calledWithExactly(req, res, next)).to.equal(true)
    expect(next.callCount).to.equal(1)
  }

  @test
  'it should configure BrowserifyMiddleware'(): void {
    const browserify = sinon.stub().resolves()
    this.BrowerifyMiddlewareStub?.returns(browserify)
    Functions.RegisterViewsAndMiddleware(this.AppFake)
    const fn = Cast<((req: Request, res: Response, next: NextFunction) => void) | undefined>(
      this.AppStub.use.secondCall.args[0],
    )
    assert(fn !== undefined)
    const req = Cast<Request>({})
    const res = Cast<Response>({})
    const next = Cast<NextFunction>({})
    fn(req, res, next)
    expect(browserify.calledWithExactly(req, res, next)).to.equal(true)
    expect(this.BrowerifyMiddlewareStub?.callCount).to.equal(1)
    expect(this.BrowerifyMiddlewareStub?.firstCall.args).to.deep.equal([
      {
        basePath: Imports.dirname + '/public',
        watchPaths: ['/scripts', '/bundles'],
      },
    ])
  }

  @test
  async 'it should call next middelware when BrowserifyMiddleware rejects'(): Promise<void> {
    const browserify = sinon.stub().rejects(new Error('FOO!'))
    this.BrowerifyMiddlewareStub?.returns(browserify)
    Functions.RegisterViewsAndMiddleware(this.AppFake)
    const fn = Cast<((req: Request, res: Response, next: NextFunction) => void) | undefined>(
      this.AppStub.use.secondCall.args[0],
    )
    assert(fn !== undefined)
    const req = Cast<Request>({})
    const res = Cast<Response>({})
    const next = sinon.stub()
    fn(req, res, Cast<NextFunction>(next))
    await Promise.resolve()
    expect(browserify.calledWithExactly(req, res, next)).to.equal(true)
    expect(next.callCount).to.equal(1)
  }

  @test
  'it should configure static file serving'(): void {
    const staticServe = { statid: Math.random() }
    this.StaticServeStub?.returns(staticServe)
    Functions.RegisterViewsAndMiddleware(this.AppFake)
    expect(this.AppStub.use.calledWith(staticServe)).to.equal(true)
    expect(this.StaticServeStub?.callCount).to.equal(1)
    expect(this.StaticServeStub?.firstCall.args).to.deep.equal([Imports.dirname + '/public'])
  }
}

@suite
export class ServerConfigureBaseAppTests {
  JsonifyStub?: Sinon.SinonStub
  UrlEncoderStub?: Sinon.SinonStub
  CookieParserStub?: Sinon.SinonStub
  FaviconStub?: Sinon.SinonStub

  AppStub = {
    use: sinon.stub(),
  }

  AppFake = Cast<Express>(this.AppStub)

  before(): void {
    this.JsonifyStub = sinon.stub(express, 'json')
    this.UrlEncoderStub = sinon.stub(express, 'urlencoded')
    this.CookieParserStub = sinon.stub(Imports, 'cookieParser')
    this.FaviconStub = sinon.stub(Imports, 'favicon')
  }

  after(): void {
    this.JsonifyStub?.restore()
    this.UrlEncoderStub?.restore()
    this.CookieParserStub?.restore()
    this.FaviconStub?.restore()
  }

  @test
  'it should contfigure jsonify'(): void {
    const json = { json: Math.random() }
    this.JsonifyStub?.returns(json)
    Functions.ConfigureBaseApp(this.AppFake)
    expect(this.AppStub.use.calledWith(json)).to.equal(true)
    expect(this.JsonifyStub?.callCount).to.equal(1)
    expect(this.JsonifyStub?.firstCall.args).to.deep.equal([])
  }

  @test
  'it should contfigure UrlEncoder'(): void {
    const urlencoded = { urlencoded: Math.random() }
    this.UrlEncoderStub?.returns(urlencoded)
    Functions.ConfigureBaseApp(this.AppFake)
    expect(this.AppStub.use.calledWith(urlencoded)).to.equal(true)
    expect(this.UrlEncoderStub?.callCount).to.equal(1)
    expect(this.UrlEncoderStub?.firstCall.args).to.deep.equal([{ extended: true }])
  }

  @test
  'it should contfigure cookie parser'(): void {
    const cookieParser = { cookieParser: Math.random() }
    this.CookieParserStub?.returns(cookieParser)
    Functions.ConfigureBaseApp(this.AppFake)
    expect(this.AppStub.use.calledWith(cookieParser)).to.equal(true)
    expect(this.CookieParserStub?.callCount).to.equal(1)
    expect(this.CookieParserStub?.firstCall.args).to.deep.equal([])
  }

  @test
  'it should contfigure favicon'(): void {
    const favicon = { favicon: Math.random() }
    this.FaviconStub?.returns(favicon)
    Functions.ConfigureBaseApp(this.AppFake)
    expect(this.AppStub.use.calledWith(favicon)).to.equal(true)
    expect(this.FaviconStub?.callCount).to.equal(1)
    expect(this.FaviconStub?.firstCall.args).to.deep.equal([Imports.dirname + '/public/images/favicon.ico'])
  }
}

@suite
export class ServerStartTests {
  AppStub = {
    get: sinon.stub(),
  }

  AppFake = Cast<Express>(this.AppStub)
  ServerFake = Cast<HttpServer>({ webserver: Math.random() })
  WebSocketsFake = Cast<WebSocketServer>({ websockets: Math.random() })

  CreateAppStub?: Sinon.SinonStub
  ConfigureBaseAppStub?: Sinon.SinonStub
  RegisterRoutersStub?: Sinon.SinonStub
  ConfigureLoggingStub?: Sinon.SinonStub
  RegisterViewsStub?: Sinon.SinonStub
  DebouncerStartStub?: Sinon.SinonStub

  before(): void {
    this.CreateAppStub = sinon
      .stub(Functions, 'CreateApp')
      .returns([this.AppFake, this.ServerFake, this.WebSocketsFake])
    this.ConfigureBaseAppStub = sinon.stub(Functions, 'ConfigureBaseApp')
    this.RegisterRoutersStub = sinon.stub(Functions, 'RegisterRouters').resolves()
    this.ConfigureLoggingStub = sinon.stub(Functions, 'ConfigureLoggingAndErrors')
    this.RegisterViewsStub = sinon.stub(Functions, 'RegisterViewsAndMiddleware')
    this.DebouncerStartStub = sinon.stub(Debouncer, 'startTimers')
  }

  after(): void {
    this.CreateAppStub?.restore()
    this.ConfigureBaseAppStub?.restore()
    this.RegisterRoutersStub?.restore()
    this.ConfigureLoggingStub?.restore()
    this.RegisterViewsStub?.restore()
    this.DebouncerStartStub?.restore()
  }

  @test
  async 'it should create app on provided port'(): Promise<void> {
    await start(8472)
    expect(this.CreateAppStub?.callCount).to.equal(1)
    expect(this.CreateAppStub?.firstCall.args).to.deep.equal([8472])
  }

  @test
  async 'it should return app and server from start'(): Promise<void> {
    const { app, server } = await start(3030)
    expect(app).to.equal(this.AppFake)
    expect(server).to.equal(this.ServerFake)
  }

  @test
  async 'it should configure base app'(): Promise<void> {
    await start(8080)
    expect(this.ConfigureBaseAppStub?.callCount).to.equal(1)
    expect(this.ConfigureBaseAppStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.ConfigureBaseAppStub?.firstCall.args[0]).to.equal(this.AppFake)
  }

  @test
  async 'it should register routers'(): Promise<void> {
    await start(8080)
    expect(this.RegisterRoutersStub?.callCount).to.equal(1)
    expect(this.RegisterRoutersStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.RegisterRoutersStub?.firstCall.args[0]).to.equal(this.AppFake)
    expect(this.RegisterRoutersStub?.firstCall.args[1]).to.equal(this.ServerFake)
    expect(this.RegisterRoutersStub?.firstCall.args[2]).to.equal(this.WebSocketsFake)
  }

  @test
  async 'it should configure logging app'(): Promise<void> {
    await start(8080)
    expect(this.ConfigureLoggingStub?.callCount).to.equal(1)
    expect(this.ConfigureLoggingStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.ConfigureLoggingStub?.firstCall.args[0]).to.equal(this.AppFake)
  }

  @test
  async 'it should register views app'(): Promise<void> {
    await start(8080)
    expect(this.RegisterViewsStub?.callCount).to.equal(1)
    expect(this.RegisterViewsStub?.firstCall.args).to.have.lengthOf(1)
    expect(this.RegisterViewsStub?.firstCall.args[0]).to.equal(this.AppFake)
  }

  @test
  async 'it should set Clacks Overhead'(): Promise<void> {
    await start(3030)
    expect(this.AppStub.get.callCount).to.equal(1)
    expect(this.AppStub.get.firstCall.args).to.have.lengthOf(2)
    expect(this.AppStub.get.firstCall.args[0]).to.equal('/*')
    const fn = Cast(
      this.AppStub.get.firstCall.args[1],
      (o: unknown): o is (a: unknown, b: unknown, c: unknown) => void => typeof o === 'function',
    )
    expect(fn).to.be.a('function')
    const resultStub = {
      set: sinon.stub(),
    }
    const nextFn = sinon.stub()
    fn(undefined, resultStub, nextFn)
    expect(resultStub.set.callCount).to.equal(1)
    expect(resultStub.set.firstCall.args).to.deep.equal(['X-Clacks-Overhead', 'GNU Terry Pratchett'])
    expect(nextFn.callCount).to.equal(1)
    expect(nextFn.calledAfter(resultStub.set)).to.equal(true)
  }

  @test
  async 'it should start timers'(): Promise<void> {
    await start(8080)
    expect(this.DebouncerStartStub?.callCount).to.equal(1)
    expect(this.DebouncerStartStub?.firstCall.args).to.deep.equal([])
  }
}
