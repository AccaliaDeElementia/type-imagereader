'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Debugger } from 'debug'
import SharpType, { Sharp } from 'sharp'
import { Application, Response, Router } from 'express'
import { Server } from 'http'
import { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'

import { getRouter, ImageData, Imports, Functions } from '../../routes/images'

function assert (condition: unknown, msg?: string): asserts condition {
  if (!condition) throw new Error(msg || 'Assertion failure!')
}

@suite
export class ImageDataTests {
  @test
  'it should create data from buffer' () {
    const buff = Buffer.from('SOME DATA HERE')
    const img = ImageData.fromImage(buff, 'webp', '/folder/image.webp')
    expect(img.code).to.equal(null)
    expect(img.statusCode).to.equal(500)
    expect(img.message).to.equal(null)
    expect(img.data).to.equal(buff)
    expect(img.extension).to.equal('webp')
    expect(img.path).to.equal('/folder/image.webp')
  }

  @test
  'it should create data from error' () {
    const img = ImageData.fromError('E_TESTING', 501, 'This is a test', '/folder/image.webp')
    expect(img.code).to.equal('E_TESTING')
    expect(img.statusCode).to.equal(501)
    expect(img.message).to.equal('This is a test')
    expect(img.data.toString()).to.equal('')
    expect(img.extension).to.equal(null)
    expect(img.path).to.equal('/folder/image.webp')
  }
}

@suite
export class ImagesReadImageTests {
  FromErrorStub?: Sinon.SinonStub
  FromImageStub?: Sinon.SinonStub
  ReadFileStub?: Sinon.SinonStub

  before () {
    this.FromErrorStub = sinon.stub(ImageData, 'fromError')
    this.FromImageStub = sinon.stub(ImageData, 'fromImage')
    this.ReadFileStub = sinon.stub(Imports, 'readFile').resolves()
  }

  after () {
    this.FromErrorStub?.restore()
    this.FromImageStub?.restore()
    this.ReadFileStub?.restore()
  }

  @test
  async 'it should reject directory traversal attempt' () {
    const img = { img: Math.random() }
    this.FromErrorStub?.returns(img)
    const result = await Functions.ReadImage('/foo/../bar/image.png')
    expect(result).to.equal(img)
    expect(this.FromErrorStub?.callCount).to.equal(1)
    expect(this.FromErrorStub?.firstCall.args).to.have.lengthOf(4)
    expect(this.FromErrorStub?.firstCall.args[0]).to.equal('E_NO_TRAVERSE')
    expect(this.FromErrorStub?.firstCall.args[1]).to.equal(StatusCodes.FORBIDDEN)
    expect(this.FromErrorStub?.firstCall.args[2]).to.equal('Directory Traversal is not Allowed!')
    expect(this.FromErrorStub?.firstCall.args[3]).to.equal('/foo/../bar/image.png')
  }

  @test
  async 'it should reject non image file' () {
    const img = { img: Math.random() }
    this.FromErrorStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.pdf')
    expect(result).to.equal(img)
    expect(this.FromErrorStub?.callCount).to.equal(1)
    expect(this.FromErrorStub?.firstCall.args).to.have.lengthOf(4)
    expect(this.FromErrorStub?.firstCall.args[0]).to.equal('E_NOT_IMAGE')
    expect(this.FromErrorStub?.firstCall.args[1]).to.equal(StatusCodes.BAD_REQUEST)
    expect(this.FromErrorStub?.firstCall.args[2]).to.equal('Requested Path is Not An Image!')
    expect(this.FromErrorStub?.firstCall.args[3]).to.equal('/foo/bar/image.pdf')
  }

  @test
  async 'it should reject missing image file' () {
    const img = { img: Math.random() }
    this.FromErrorStub?.returns(img)
    this.ReadFileStub?.rejects()
    const result = await Functions.ReadImage('/foo/bar/image.gif')
    expect(result).to.equal(img)
    expect(this.FromErrorStub?.callCount).to.equal(1)
    expect(this.FromErrorStub?.firstCall.args).to.have.lengthOf(4)
    expect(this.FromErrorStub?.firstCall.args[0]).to.equal('E_NOT_FOUND')
    expect(this.FromErrorStub?.firstCall.args[1]).to.equal(StatusCodes.NOT_FOUND)
    expect(this.FromErrorStub?.firstCall.args[2]).to.equal('Requested Path Not Found!')
    expect(this.FromErrorStub?.firstCall.args[3]).to.equal('/foo/bar/image.gif')
  }

  @test
  async 'it should read file for valid image path' () {
    const img = { img: Math.random() }
    const data = Buffer.from('SOME DATA HERE')
    this.FromImageStub?.returns(img)
    this.ReadFileStub?.resolves(data)
    await Functions.ReadImage('/foo/bar/image.gif')
    expect(this.ReadFileStub?.firstCall.args).to.deep.equal(['/data/foo/bar/image.gif'])
  }

  @test
  async 'it should return found image' () {
    const img = { img: Math.random() }
    const data = Buffer.from('SOME DATA HERE')
    this.FromImageStub?.returns(img)
    this.ReadFileStub?.resolves(data)
    const result = await Functions.ReadImage('/foo/bar/image.gif')
    expect(result).to.equal(img)
    expect(this.FromImageStub?.callCount).to.equal(1)
    expect(this.FromImageStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.FromImageStub?.firstCall.args[0]).to.equal(data)
    expect(this.FromImageStub?.firstCall.args[1]).to.equal('gif')
    expect(this.FromImageStub?.firstCall.args[2]).to.equal('/foo/bar/image.gif')
  }

  @test
  async 'it should allow .jpg' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jpg')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .jpeg' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jpeg')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .png' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.png')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .webp' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.webp')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .gif' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.gif')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .svg' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.svg')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .tif' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.tif')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .tiff' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.tiff')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .bmp' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.bmp')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .jfif' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jfif')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .jpe' () {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jpe')
    expect(result).to.equal(img)
  }
}

@suite
export class ImagesRescaleImageTests {
  SharpInstanceStub = {
    rotate: sinon.stub().returnsThis(),
    resize: sinon.stub().returnsThis(),
    webp: sinon.stub().returnsThis(),
    toBuffer: sinon.stub().resolves()
  }

  SharpStub?: Sinon.SinonStub

  before () {
    this.SharpStub = sinon.stub(Imports, 'Sharp').returns(this.SharpInstanceStub as unknown as Sharp)
  }

  after () {
    this.SharpStub?.restore()
  }

  @test
  async 'it should abort when error already detected' () {
    const img = new ImageData()
    img.code = 'FOO'
    await Functions.RescaleImage(img, 1280, 720)
    expect(this.SharpStub?.callCount).to.equal(0)
  }

  @test
  async 'it should parse Sharp data' () {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720)
    assert(this.SharpStub)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[0]).to.equal(data)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: true })
  }

  @test
  async 'it should default to handling animated images' () {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720)
    assert(this.SharpStub)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: true })
  }

  @test
  async 'it should request animated images explicitly' () {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720, true)
    assert(this.SharpStub)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: true })
  }

  @test
  async 'it should decline animated images explicitly' () {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720, false)
    assert(this.SharpStub)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: false })
  }

  @test
  async 'it should convert to webp' () {
    const img = new ImageData()
    img.extension = 'fake extension'
    await Functions.RescaleImage(img, 1280, 720)
    expect(this.SharpInstanceStub.webp.callCount).to.equal(1)
    expect(this.SharpInstanceStub.webp.firstCall.args).to.have.lengthOf(0)
    expect(img.extension).to.equal('webp')
  }

  @test
  async 'it should output as buffer' () {
    const img = new ImageData()
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    this.SharpInstanceStub.toBuffer.resolves(data)
    await Functions.RescaleImage(img, 1280, 720)
    expect(this.SharpInstanceStub.toBuffer.callCount).to.equal(1)
    expect(this.SharpInstanceStub.toBuffer.firstCall.args).to.have.lengthOf(0)
    expect(img.data).to.equal(data)
  }

  @test
  async 'it should resize with expected parameters' () {
    await Functions.RescaleImage(new ImageData(), 1280, 720)
    expect(this.SharpInstanceStub.resize.callCount).to.equal(1)
    expect(this.SharpInstanceStub.resize.firstCall.args).to.have.lengthOf(1)
    const args = this.SharpInstanceStub.resize.firstCall.args[0]
    expect(args).to.have.all.keys('width', 'height', 'fit', 'withoutEnlargement')
    expect(args.width).to.equal(1280)
    expect(args.height).to.equal(720)
    expect(args.fit).to.equal(SharpType.fit.inside)
    expect(args.withoutEnlargement).to.equal(true)
  }

  @test
  async 'it ignore error when sharp throws' () {
    const img = new ImageData()
    this.SharpStub?.throws(new Error('OOPS'))
    await Functions.RescaleImage(img, 1280, 720)
    expect(img.code).to.equal(null)
    expect(img.statusCode).to.equal(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(img.message).to.equal(null)
  }

  @test
  async 'it should ignore sharp reejection' () {
    const img = new ImageData()
    this.SharpInstanceStub.toBuffer.rejects(new Error('OOPS'))
    await Functions.RescaleImage(img, 1280, 720)
    expect(img.code).to.equal(null)
    expect(img.statusCode).to.equal(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(img.message).to.equal(null)
  }
}

@suite
export class ImagesSendImageTests {
  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    set: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis()
  }

  ResponseFake = this.ResponseStub as unknown as Response

  @test
  'it should set content-type for valid image' () {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.set.calledWith('Content-Type', 'image/webp')).to.equal(true)
  }

  @test
  'it should set cacheControl for valid image' () {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.set.calledWith('Cache-Control', 'public, max-age=2592000000')).to.equal(true)
  }

  @test
  'it should set Expires for valid image' () {
    const aMonth = 1000 * 60 * 60 * 24 * 30
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.set.calledWith('Expires', new Date(Date.now() + aMonth).toUTCString())).to.equal(true)
  }

  @test
  'it should send image data for valid image' () {
    const data = Buffer.from('Image Data')
    const img = ImageData.fromImage(data, 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.send.firstCall.args[0]).to.equal(data)
  }

  @test
  'it should not set status code explicitly' () {
    Functions.SendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(0)
  }

  @test
  'it should not send json data' () {
    Functions.SendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(0)
  }

  @test
  'it should not set headers for invalid image' () {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.set.callCount).to.equal(0)
  }

  @test
  'it should not send data for invalid image' () {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(0)
  }

  @test
  'it should set http status for invalid image' () {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([418])
  }

  @test
  'it should send json data for invalid image' () {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{
      error: {
        code: 'E_TEST_ERROR',
        message: 'A Test Error',
        path: '/image.png'
      }
    }])
  }
}

@suite
export class ImagesGetRouterTests {
  ApplicationFake = {} as unknown as Application
  ServerFake = {} as unknown as Server
  WebsocketsFake = {} as unknown as WebSocketServer

  RouterFake = {
    get: sinon.stub().returnsThis()
  }

  RequestStub = {
    params: {
      0: '',
      x: '',
      y: ''
    },
    body: '',
    originalUrl: ''
  }

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis()
  }

  LoggerStub = sinon.stub()
  DebugStub?: Sinon.SinonStub

  RouterStub?: Sinon.SinonStub
  ReadImageStub?: Sinon.SinonStub
  RescaleImageStub?: Sinon.SinonStub
  SendImageStub?: Sinon.SinonStub

  before () {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(this.LoggerStub as unknown as Debugger)
    this.RouterStub = sinon.stub(Imports, 'Router').returns(this.RouterFake as unknown as Router)
    this.ReadImageStub = sinon.stub(Functions, 'ReadImage').resolves()
    this.RescaleImageStub = sinon.stub(Functions, 'RescaleImage').resolves()
    this.SendImageStub = sinon.stub(Functions, 'SendImage').resolves()
  }

  after () {
    this.DebugStub?.restore()
    this.RouterStub?.restore()
    this.ReadImageStub?.restore()
    this.RescaleImageStub?.restore()
    this.SendImageStub?.restore()
  }

  @test
  async 'it should create and return router' () {
    const router = await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterStub?.callCount).to.equal(1)
    expect(this.RouterStub?.firstCall.args).to.deep.equal([])
    expect(router).to.equal(this.RouterFake)
  }

  @test
  async 'it should create logger for logging (but later)' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.DebugStub?.callCount).to.equal(1)
    expect(this.DebugStub?.firstCall.args).to.deep.equal(['type-imagereader:images'])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'it should register routes' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.callCount).to.equal(4)
  }

  @test
  async 'it should register full image route' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/full/*')).to.equal(true)
  }

  @test
  async 'it should register scaled image route' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/scaled/:x/:y/*-image.webp')).to.equal(true)
  }

  @test
  async 'it should register preview image route' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/preview/*-image.webp')).to.equal(true)
  }

  @test
  async 'it should register kiosk image route' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/kiosk/*-image.webp')).to.equal(true)
  }

  @test
  async 'FullImage - it should get filename from full image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/full/*')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/foo/bar.png'])
  }

  @test
  async 'FullImage - it should get default filename from full image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/full/*')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = ''
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/'])
  }

  @test
  async 'FullImage - it should get send image directly from reading' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/full/*')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SendImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.SendImageStub?.firstCall.args[1]).to.equal(this.ResponseStub)
  }

  @test
  async 'FullImage - it should handle error' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/full/*')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    const err = new Error('SOME ERROR')
    this.ReadImageStub?.rejects(err)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{
      error: {
        code: 'EINTERNALERROR',
        message: 'Internal Server Error'
      }
    }])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /full/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }

  @test
  async 'ScaledImage - it should get filename from full image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/scaled/:x/:y/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/foo/bar.png'])
  }

  @test
  async 'ScaledImage - it should get default filename from full image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/scaled/:x/:y/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = ''
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/'])
  }

  @test
  async 'ScaledImage - it should rescale image after reading' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/scaled/:x/:y/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    this.RequestStub.params.x = '1024'
    this.RequestStub.params.y = '768'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.RescaleImageStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.RescaleImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.RescaleImageStub?.firstCall.args[1]).to.equal(1024)
    expect(this.RescaleImageStub?.firstCall.args[2]).to.equal(768)
  }

  @test
  async 'ScaledImage - it should send image after scaling' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/scaled/:x/:y/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SendImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.SendImageStub?.firstCall.args[1]).to.equal(this.ResponseStub)
  }

  @test
  async 'ScaledImage - it should handle error' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/full/*')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')

    const err = new Error('SOME ERROR')
    this.ReadImageStub?.rejects(err)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{
      error: {
        code: 'EINTERNALERROR',
        message: 'Internal Server Error'
      }
    }])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /full/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }

  @test
  async 'PreviewImage - it should get filename from full image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/preview/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/foo/bar.png'])
  }

  @test
  async 'PreviewImage - it should get default filename from full image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/preview/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = ''
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/'])
  }

  @test
  async 'PreviewImage - it should get resize image for preview' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/preview/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.RescaleImageStub?.firstCall.args).to.have.lengthOf(4)
    expect(this.RescaleImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.RescaleImageStub?.firstCall.args[1]).to.equal(240)
    expect(this.RescaleImageStub?.firstCall.args[2]).to.equal(320)
    expect(this.RescaleImageStub?.firstCall.args[3]).to.equal(false)
  }

  @test
  async 'PreviewImage - it should get send image directly from reading' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/preview/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.SendImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SendImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.SendImageStub?.firstCall.args[1]).to.equal(this.ResponseStub)
  }

  @test
  async 'PreviewImage - it should not reject on success' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/preview/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'PreviewImage - it should handle error' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/preview/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const err = new Error('SOME ERROR')
    this.ReadImageStub?.rejects(err)

    this.RequestStub.originalUrl = '/preview/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{
      error: {
        code: 'EINTERNALERROR',
        message: 'Internal Server Error'
      }
    }])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /preview/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }

  @test
  async 'KioskImage - it should get filename from kiosk image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/kiosk/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/foo/bar.png'])
  }

  @test
  async 'KioskImage - it should get default filename from full image request' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/kiosk/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = ''
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/'])
  }

  @test
  async 'KioskImage - it should get resize image for kiosk image' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/kiosk/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.RescaleImageStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.RescaleImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.RescaleImageStub?.firstCall.args[1]).to.equal(1280)
    expect(this.RescaleImageStub?.firstCall.args[2]).to.equal(720)
  }

  @test
  async 'KioskImage - it should get send image' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/kiosk/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SendImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.SendImageStub?.firstCall.args[1]).to.equal(this.ResponseStub)
  }

  @test
  async 'KioskImage - it should not reject for non error' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/kiosk/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(this.RequestStub, this.ResponseStub)

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'KioskImage - it should handle error' () {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get.getCalls()
      .filter(call => call.args[0] === '/kiosk/*-image.webp')
      .map(call => call.args[1])[0]
    assert(fn, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const err = new Error('SOME ERROR')
    this.ReadImageStub?.rejects(err)

    this.RequestStub.originalUrl = '/kiosk/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(this.RequestStub, this.ResponseStub)

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([{
      error: {
        code: 'EINTERNALERROR',
        message: 'Internal Server Error'
      }
    }])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /kiosk/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }
}
