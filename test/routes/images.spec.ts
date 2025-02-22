'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import type { Debugger } from 'debug'
import SharpType from 'sharp'
import type { Sharp } from 'sharp'
import type { Application, Response, Router, Request } from 'express'
import type { Server } from 'http'
import type { Server as WebSocketServer } from 'socket.io'
import { StatusCodes } from 'http-status-codes'

import { getRouter, ImageData, ImageCache, Imports, Functions, CacheStorage } from '../../routes/images'
import assert from 'assert'
import { Cast } from '../testutils/TypeGuards'
type RequestHandler = (req: Request, res: Response) => Promise<void>

@suite
export class ImageCacheTests {
  before(): void {
    ImageCache.cacheSize = 5
  }

  @test
  'it should save cache creator fn on construct'(): void {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    expect(cache.cacheFunction).to.equal(spy)
  }

  @test
  'it should construct with empty item cache'(): void {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    expect(cache.items).to.have.lengthOf(0)
  }

  @test
  async 'it should fetch existing item from cache'(): Promise<void> {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    const expected = { ImageData: 71 }
    cache.items[0] = {
      path: '/foo.png',
      width: 5,
      height: 5,
      image: Cast<Promise<ImageData>>(expected),
    }
    expect(await cache.fetch('/foo.png', 5, 5)).to.equal(expected)
  }

  @test
  async 'it should fetch existing item from cache when bigger'(): Promise<void> {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    const expected = { ImageData: 45 }
    cache.items[0] = {
      path: '/foo.png',
      width: 50,
      height: 50,
      image: Cast<Promise<ImageData>>(expected),
    }
    expect(await cache.fetch('/foo.png', 5, 5)).to.equal(expected)
  }

  @test
  async 'it should not create cache item when one is found'(): Promise<void> {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    const expected = Promise.resolve(null)
    cache.items[0] = {
      path: '/foo.png',
      width: 5,
      height: 5,
      image: Cast<Promise<ImageData>>(expected),
    }
    await cache.fetch('/foo.png', 5, 5)
    expect(spy.called).to.equal(false)
  }

  @test
  async 'it should not create cache item when bigger one is found'(): Promise<void> {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    const expected = Promise.resolve(null)
    cache.items[0] = {
      path: '/foo.png',
      width: 50,
      height: 50,
      image: Cast<Promise<ImageData>>(expected),
    }
    await cache.fetch('/foo.png', 5, 5)
    expect(spy.called).to.equal(false)
  }

  @test
  async 'it should refresh recency of item in cache'(): Promise<void> {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    for (let i = 0; i < 10; i++) {
      cache.items[i] = {
        path: '/bar.png',
        width: i,
        height: i,
        image: Cast<Promise<ImageData>>(null),
      }
    }
    const expected = {
      path: '/foo.png',
      width: 5,
      height: 5,
      image: Cast<Promise<ImageData>>(Promise.resolve(null)),
    }
    cache.items[10] = expected
    await cache.fetch('/foo.png', 5, 5)
    expect(cache.items[0]).to.equal(expected)
    for (let i = 1; i <= 10; i++) {
      expect(cache.items[i]?.width).to.equal(i - 1)
    }
  }

  @test
  async 'it should create new cache item when not found'(): Promise<void> {
    const expected = Cast<ImageData>({ Image: 55 })
    const spy = sinon.stub().resolves(expected)
    const cache = new ImageCache(spy)
    expect(await cache.fetch('/foo.png', 5, 5)).to.equal(expected)
    expect(spy.called).to.equal(true)
  }

  @test
  async 'it should create cache item with expected parameters'(): Promise<void> {
    const path = '/foo.png' + Math.random()
    const width = Math.random() * 1000
    const height = Math.random() * 1000
    const image = Promise.resolve(null)
    const spy = sinon.stub().returns(image)
    const cache = new ImageCache(spy)
    await cache.fetch(path, width, height)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args).to.have.lengthOf(3)
    expect(spy.firstCall.args).to.deep.equal([path, width, height])
  }

  @test
  async 'it should insert new cache item at front'(): Promise<void> {
    const path = '/foo.png' + Math.random()
    const width = Math.random() * 1000
    const height = Math.random() * 1000
    const image = Promise.resolve(null)
    const spy = sinon.stub().returns(image)
    const cache = new ImageCache(spy)
    await cache.fetch(path, width, height)
    assert(cache.items[0] !== undefined)
    expect(cache.items[0].path).to.equal(path)
    expect(cache.items[0].width).to.equal(width)
    expect(cache.items[0].height).to.equal(height)
    expect(cache.items[0].image).to.equal(image)
  }

  @test
  async 'it should prune excessive cache items when no cache item matches'(): Promise<void> {
    const spy = sinon.stub().resolves('true')
    const cache = new ImageCache(spy)
    ImageCache.cacheSize = 5
    for (let i = 0; i < 10; i++) {
      cache.items[i] = {
        path: '/bar.png',
        width: i,
        height: i,
        image: Cast<Promise<ImageData>>(null),
      }
    }
    await cache.fetch('/foo.png', 5, 5)
    expect(cache.items).have.lengthOf(5)
    for (let i = 1; i < 5; i++) {
      expect(cache.items[i]?.height).to.equal(i - 1)
      expect(cache.items[i]?.width).to.equal(i - 1)
    }
  }
}

@suite
export class ImageDataTests {
  @test
  'it should create data from buffer'(): void {
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
  'it should create data from error'(): void {
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

  before(): void {
    this.FromErrorStub = sinon.stub(ImageData, 'fromError')
    this.FromImageStub = sinon.stub(ImageData, 'fromImage')
    this.ReadFileStub = sinon.stub(Imports, 'readFile').resolves()
  }

  after(): void {
    this.FromErrorStub?.restore()
    this.FromImageStub?.restore()
    this.ReadFileStub?.restore()
  }

  @test
  async 'it should reject directory traversal attempt'(): Promise<void> {
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
  async 'it should reject non image file'(): Promise<void> {
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
  async 'it should reject missing image file'(): Promise<void> {
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
  async 'it should read file for valid image path'(): Promise<void> {
    const img = { img: Math.random() }
    const data = Buffer.from('SOME DATA HERE')
    this.FromImageStub?.returns(img)
    this.ReadFileStub?.resolves(data)
    await Functions.ReadImage('/foo/bar/image.gif')
    expect(this.ReadFileStub?.firstCall.args).to.deep.equal(['/data/foo/bar/image.gif'])
  }

  @test
  async 'it should return found image'(): Promise<void> {
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
  async 'it should allow .jpg'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jpg')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .jpeg'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jpeg')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .png'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.png')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .webp'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.webp')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .gif'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.gif')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .svg'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.svg')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .tif'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.tif')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .tiff'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.tiff')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .bmp'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.bmp')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .jfif'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jfif')
    expect(result).to.equal(img)
  }

  @test
  async 'it should allow .jpe'(): Promise<void> {
    const img = { img: Math.random() }
    this.FromImageStub?.returns(img)
    const result = await Functions.ReadImage('/foo/bar/image.jpe')
    expect(result).to.equal(img)
  }
}

interface SharpArgs {
  width: unknown
  height: unknown
  fit: unknown
  withoutEnlargement: unknown
}

@suite
export class ImagesRescaleImageTests {
  SharpInstanceStub = {
    rotate: sinon.stub().returnsThis(),
    resize: sinon.stub().returnsThis(),
    webp: sinon.stub().returnsThis(),
    toBuffer: sinon.stub().resolves(),
  }

  SharpStub?: Sinon.SinonStub

  before(): void {
    this.SharpStub = sinon.stub(Imports, 'Sharp').returns(Cast<Sharp>(this.SharpInstanceStub))
  }

  after(): void {
    this.SharpStub?.restore()
  }

  @test
  async 'it should abort when error already detected'(): Promise<void> {
    const img = new ImageData()
    img.code = 'FOO'
    await Functions.RescaleImage(img, 1280, 720)
    expect(this.SharpStub?.callCount).to.equal(0)
  }

  @test
  async 'it should parse Sharp data'(): Promise<void> {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720)
    assert(this.SharpStub !== undefined)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[0]).to.equal(data)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: true })
  }

  @test
  async 'it should default to handling animated images'(): Promise<void> {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720)
    assert(this.SharpStub !== undefined)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: true })
  }

  @test
  async 'it should request animated images explicitly'(): Promise<void> {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720, true)
    assert(this.SharpStub !== undefined)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: true })
  }

  @test
  async 'it should decline animated images explicitly'(): Promise<void> {
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    const img = new ImageData()
    img.data = data
    await Functions.RescaleImage(img, 1280, 720, false)
    assert(this.SharpStub !== undefined)
    expect(this.SharpStub.callCount).to.equal(1)
    expect(this.SharpStub.firstCall.args).to.have.lengthOf(2)
    expect(this.SharpStub.firstCall.args[1]).to.deep.equal({ animated: false })
  }

  @test
  async 'it should convert to webp'(): Promise<void> {
    const img = new ImageData()
    img.extension = 'fake extension'
    await Functions.RescaleImage(img, 1280, 720)
    expect(this.SharpInstanceStub.webp.callCount).to.equal(1)
    expect(this.SharpInstanceStub.webp.firstCall.args).to.have.lengthOf(0)
    expect(img.extension).to.equal('webp')
  }

  @test
  async 'it should output as buffer'(): Promise<void> {
    const img = new ImageData()
    const data = Buffer.from(`{ image: ${Math.random()} }`)
    this.SharpInstanceStub.toBuffer.resolves(data)
    await Functions.RescaleImage(img, 1280, 720)
    expect(this.SharpInstanceStub.toBuffer.callCount).to.equal(1)
    expect(this.SharpInstanceStub.toBuffer.firstCall.args).to.have.lengthOf(0)
    expect(img.data).to.equal(data)
  }

  @test
  async 'it should resize with expected parameters'(): Promise<void> {
    await Functions.RescaleImage(new ImageData(), 1280, 720)
    expect(this.SharpInstanceStub.resize.callCount).to.equal(1)
    expect(this.SharpInstanceStub.resize.firstCall.args).to.have.lengthOf(1)
    const args = Cast<SharpArgs>(this.SharpInstanceStub.resize.firstCall.args[0])
    expect(args).to.have.all.keys('width', 'height', 'fit', 'withoutEnlargement')
    expect(args.width).to.equal(1280)
    expect(args.height).to.equal(720)
    expect(args.fit).to.equal(SharpType.fit.inside)
    expect(args.withoutEnlargement).to.equal(true)
  }

  @test
  async 'it ignore error when sharp throws'(): Promise<void> {
    const img = new ImageData()
    this.SharpStub?.throws(new Error('OOPS'))
    await Functions.RescaleImage(img, 1280, 720)
    expect(img.code).to.equal(null)
    expect(img.statusCode).to.equal(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(img.message).to.equal(null)
  }

  @test
  async 'it should ignore sharp reejection'(): Promise<void> {
    const img = new ImageData()
    this.SharpInstanceStub.toBuffer.rejects(new Error('OOPS'))
    await Functions.RescaleImage(img, 1280, 720)
    expect(img.code).to.equal(null)
    expect(img.statusCode).to.equal(StatusCodes.INTERNAL_SERVER_ERROR)
    expect(img.message).to.equal(null)
  }
}

@suite
export class ImagesReadAndRescaleImageTests {
  readImageStub = sinon.stub()
  rescaleImageStub = sinon.stub()

  before(): void {
    this.readImageStub = sinon.stub(Functions, 'ReadImage').resolves()
    this.rescaleImageStub = sinon.stub(Functions, 'RescaleImage').resolves()
  }

  after(): void {
    this.rescaleImageStub.restore()
    this.readImageStub.restore()
  }

  @test
  async 'it should read image as requested'(): Promise<void> {
    await Functions.ReadAndRescaleImage('/foo.png', 999, 999)
    expect(this.readImageStub.callCount).to.equal(1)
    expect(this.readImageStub.firstCall.args).to.deep.equal(['/foo.png'])
  }

  @test
  async 'it should rescale image as read'(): Promise<void> {
    const img = Math.random()
    this.readImageStub.resolves(img)
    const width = Math.random()
    const height = Math.random()
    await Functions.ReadAndRescaleImage('/foo.png', width, height, true)
    expect(this.rescaleImageStub.callCount).to.equal(1)
    expect(this.rescaleImageStub.firstCall.args).to.deep.equal([img, width, height, true])
  }

  @test
  async 'it should default enable animated image support'(): Promise<void> {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99)
    expect(this.rescaleImageStub.callCount).to.equal(1)
    expect(this.rescaleImageStub.firstCall.args[3]).to.equal(true)
  }

  @test
  async 'it should enable animated image support explicitly'(): Promise<void> {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, true)
    expect(this.rescaleImageStub.callCount).to.equal(1)
    expect(this.rescaleImageStub.firstCall.args[3]).to.equal(true)
  }

  @test
  async 'it should disable animated image support explicitly'(): Promise<void> {
    await Functions.ReadAndRescaleImage('/foo.png', 99, 99, false)
    expect(this.rescaleImageStub.callCount).to.equal(1)
    expect(this.rescaleImageStub.firstCall.args[3]).to.equal(false)
  }
}

@suite
export class ImagesSendImageTests {
  ResponseStub = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    set: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
  }

  ResponseFake = Cast<Response>(this.ResponseStub)

  @test
  'it should set content-type for valid image'(): void {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.set.calledWith('Content-Type', 'image/webp')).to.equal(true)
  }

  @test
  'it should set cacheControl for valid image'(): void {
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.set.calledWith('Cache-Control', 'public, max-age=2592000000')).to.equal(true)
  }

  @test
  'it should set Expires for valid image'(): void {
    const aMonth = 1000 * 60 * 60 * 24 * 30
    const img = ImageData.fromImage(Buffer.from(''), 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.set.calledWith('Expires', new Date(Date.now() + aMonth).toUTCString())).to.equal(true)
  }

  @test
  'it should send image data for valid image'(): void {
    const data = Buffer.from('Image Data')
    const img = ImageData.fromImage(data, 'webp', '/image.png')
    Functions.SendImage(img, this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(1)
    expect(this.ResponseStub.send.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.send.firstCall.args[0]).to.equal(data)
  }

  @test
  'it should not set status code explicitly'(): void {
    Functions.SendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(0)
  }

  @test
  'it should not send json data'(): void {
    Functions.SendImage(ImageData.fromImage(Buffer.from(''), 'webp', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(0)
  }

  @test
  'it should not set headers for invalid image'(): void {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.set.callCount).to.equal(0)
  }

  @test
  'it should not send data for invalid image'(): void {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.send.callCount).to.equal(0)
  }

  @test
  'it should set http status for invalid image'(): void {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([418])
  }

  @test
  'it should send json data for invalid image'(): void {
    Functions.SendImage(ImageData.fromError('E_TEST_ERROR', 418, 'A Test Error', '/image.png'), this.ResponseFake)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_TEST_ERROR',
          message: 'A Test Error',
          path: '/image.png',
        },
      },
    ])
  }
}

@suite
export class ImagesDefaultCacheStubTests {
  @test
  async 'default Kiosk Cache should report error'(): Promise<void> {
    const image = await CacheStorage.kioskCache.fetch('/foo.png', 1280, 800)
    expect(image.code).to.equal('INTERNAL_SERVER_ERROR')
    expect(image.statusCode).to.equal(500)
    expect(image.message).to.equal('CACHE_NOT_INITIALIZED')
    expect(image.path).to.equal('/foo.png')
  }

  @test
  async 'default scaled Cache should report error'(): Promise<void> {
    const image = await CacheStorage.scaledCache.fetch('/foo.png', 1280, 800)
    expect(image.code).to.equal('INTERNAL_SERVER_ERROR')
    expect(image.statusCode).to.equal(500)
    expect(image.message).to.equal('CACHE_NOT_INITIALIZED')
    expect(image.path).to.equal('/foo.png')
  }
}

interface IRequestParams {
  0: string | undefined
  width: string | undefined
  height: string | undefined
}

interface MockedRequest {
  params: IRequestParams
  body: string | undefined
  originalUrl: string | undefined
}

interface MockedResponse {
  status: Sinon.SinonStub
  json: Sinon.SinonStub
}

@suite
export class ImagesGetRouterTests {
  ApplicationFake = Cast<Application>({})
  ServerFake = Cast<Server>({})
  WebsocketsFake = Cast<WebSocketServer>({})

  RouterFake = {
    get: sinon.stub().returnsThis(),
  }

  RequestStub: MockedRequest = {
    params: {
      0: '',
      width: '1000',
      height: '1000',
    },
    body: '',
    originalUrl: '',
  }

  ResponseStub: MockedResponse = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
  }

  LoggerStub = sinon.stub()
  DebugStub?: Sinon.SinonStub

  RouterStub?: Sinon.SinonStub
  ReadImageStub?: Sinon.SinonStub
  RescaleImageStub?: Sinon.SinonStub
  SendImageStub?: Sinon.SinonStub

  before(): void {
    this.DebugStub = sinon.stub(Imports, 'debug').returns(Cast<Debugger>(this.LoggerStub))
    this.RouterStub = sinon.stub(Imports, 'Router').returns(Cast<Router>(this.RouterFake))
    this.ReadImageStub = sinon.stub(Functions, 'ReadImage').resolves()
    this.RescaleImageStub = sinon.stub(Functions, 'RescaleImage').resolves()
    this.SendImageStub = sinon.stub(Functions, 'SendImage').resolves()
  }

  after(): void {
    this.DebugStub?.restore()
    this.RouterStub?.restore()
    this.ReadImageStub?.restore()
    this.RescaleImageStub?.restore()
    this.SendImageStub?.restore()
  }

  @test
  async 'it should create and return router'(): Promise<void> {
    const router = await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterStub?.callCount).to.equal(1)
    expect(this.RouterStub?.firstCall.args).to.deep.equal([])
    expect(router).to.equal(this.RouterFake)
  }

  @test
  async 'it should create logger for logging (but later)'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.DebugStub?.callCount).to.equal(1)
    expect(this.DebugStub?.firstCall.args).to.deep.equal(['type-imagereader:images'])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'it should create kiosk image cache'(): Promise<void> {
    CacheStorage.kioskCache = Cast<ImageCache>(null)
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(CacheStorage.kioskCache).to.not.equal(null)
    expect(CacheStorage.kioskCache.cacheFunction).to.equal(Functions.ReadAndRescaleImage)
    expect(CacheStorage.kioskCache.items).to.have.lengthOf(0)
  }

  @test
  async 'it should create scaled image cache'(): Promise<void> {
    CacheStorage.scaledCache = Cast<ImageCache>(null)
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(CacheStorage.scaledCache).to.not.equal(null)
    expect(CacheStorage.scaledCache.cacheFunction).to.equal(Functions.ReadAndRescaleImage)
    expect(CacheStorage.scaledCache.items).to.have.lengthOf(0)
  }

  @test
  async 'it should register routes'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.callCount).to.equal(4)
  }

  @test
  async 'it should register full image route'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/full/*')).to.equal(true)
  }

  @test
  async 'it should register scaled image route'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/scaled/:width/:height/*-image.webp')).to.equal(true)
  }

  @test
  async 'it should register preview image route'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/preview/*-image.webp')).to.equal(true)
  }

  @test
  async 'it should register kiosk image route'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    expect(this.RouterFake.get.calledWith('/kiosk/*-image.webp')).to.equal(true)
  }

  @test
  async 'FullImage - it should get filename from full image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/full/*')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/foo/bar.png'])
  }

  @test
  async 'FullImage - it should get default filename from full image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/full/*')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = ''
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/'])
  }

  @test
  async 'FullImage - it should get send image directly from reading'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/full/*')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

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
  async 'FullImage - it should handle error'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/full/*')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const err = new Error('SOME ERROR')
    this.ReadImageStub?.rejects(err)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'EINTERNALERROR',
          message: 'Internal Server Error',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /full/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }

  @test
  async 'ScaledImage - it should get filename from full image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal('/foo/bar.png')
  }

  @test
  async 'ScaledImage - it should get default filename from full image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.params[0] = ''
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal('/')
  }

  @test
  async 'ScaledImage - it should rescale image after reading'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.params.width = '1024'
    this.RequestStub.params.height = '768'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args).to.have.lengthOf(3)
    expect(spy.firstCall.args[1]).to.equal(1024)
    expect(spy.firstCall.args[2]).to.equal(768)
  }

  @test
  async 'ScaledImage - it should send image after scaling'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SendImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.SendImageStub?.firstCall.args[1]).to.equal(this.ResponseStub)
  }

  @test
  async 'ScaledImage - it reject missing width parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.width = Cast<string>(undefined)
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'width parameter must be provided',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject empty width parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.width = undefined
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'width parameter must be provided',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject non-number width parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.width = 'fish'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'width parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject decimal width parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.width = '3.14159'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'width parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject negative width parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.width = '-100'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'width parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject zero width parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.width = '0'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'width parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject zero prefixed width parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.width = '0999'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'width parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject missing height parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.height = Cast<string>(undefined)
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'height parameter must be provided',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject empty height parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.height = undefined
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'height parameter must be provided',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject non-number height parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.height = 'fish'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'height parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject decimal height parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.height = '3.14159'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'height parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject negative height parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.height = '-100'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'height parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject zero height parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.height = '0'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'height parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it reject zero prefixed height parameter'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.params.height = '0999'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([StatusCodes.BAD_REQUEST])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'E_BAD_REQUEST',
          message: 'height parameter must be positive integer',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'ScaledImage - it should handle error'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined)
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.scaledCache, 'fetch')
    const err = new Error('SOME ERROR')
    spy.rejects(err)

    this.RequestStub.originalUrl = '/full/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'EINTERNALERROR',
          message: 'Internal Server Error',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /full/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }

  @test
  async 'PreviewImage - it should get filename from full image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/preview/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/foo/bar.png'])
  }

  @test
  async 'PreviewImage - it should get default filename from full image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/preview/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    this.RequestStub.params[0] = ''
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ReadImageStub?.callCount).to.equal(1)
    expect(this.ReadImageStub?.firstCall.args).to.deep.equal(['/'])
  }

  @test
  async 'PreviewImage - it should get resize image for preview'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/preview/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.RescaleImageStub?.firstCall.args).to.have.lengthOf(4)
    expect(this.RescaleImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.RescaleImageStub?.firstCall.args[1]).to.equal(240)
    expect(this.RescaleImageStub?.firstCall.args[2]).to.equal(320)
    expect(this.RescaleImageStub?.firstCall.args[3]).to.equal(false)
  }

  @test
  async 'PreviewImage - it should get send image directly from reading'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/preview/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.SendImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SendImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.SendImageStub?.firstCall.args[1]).to.equal(this.ResponseStub)
  }

  @test
  async 'PreviewImage - it should not reject on success'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/preview/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'PreviewImage - it should handle error'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/preview/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const err = new Error('SOME ERROR')
    this.ReadImageStub?.rejects(err)

    this.RequestStub.originalUrl = '/preview/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'EINTERNALERROR',
          message: 'Internal Server Error',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /preview/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }

  @test
  async 'KioskImage - it should get filename from kiosk image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/kiosk/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.kioskCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.params[0] = 'foo/bar.png'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.equal('/foo/bar.png')
  }

  @test
  async 'KioskImage - it should get default filename from full image request'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/kiosk/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.kioskCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    this.RequestStub.params[0] = ''
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args[0]).to.deep.equal('/')
  }

  @test
  async 'KioskImage - it should resize image to static size for kiosk image'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/kiosk/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const spy = sinon.stub(CacheStorage.kioskCache, 'fetch')
    const img = Cast<ImageData>({ image: Math.random() })
    spy.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args).to.have.lengthOf(3)
    expect(spy.firstCall.args[1]).to.equal(1280)
    expect(spy.firstCall.args[2]).to.equal(800)
  }

  @test
  async 'KioskImage - it should get send image'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/kiosk/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.RescaleImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.callCount).to.equal(1)
    expect(this.SendImageStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SendImageStub?.firstCall.args[0]).to.equal(img)
    expect(this.SendImageStub?.firstCall.args[1]).to.equal(this.ResponseStub)
  }

  @test
  async 'KioskImage - it should not reject for non error'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/kiosk/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const img = new ImageData()
    this.ReadImageStub?.resolves(img)

    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(0)
    expect(this.LoggerStub.callCount).to.equal(0)
  }

  @test
  async 'KioskImage - it should handle error'(): Promise<void> {
    await getRouter(this.ApplicationFake, this.ServerFake, this.WebsocketsFake)
    const fn = this.RouterFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/kiosk/*-image.webp')
      .map((call) => Cast<RequestHandler>(call.args[1]))[0]
    assert(fn !== undefined, 'Router handler should be found')
    expect(fn).to.be.a('function')

    const err = new Error('SOME ERROR')
    this.ReadImageStub?.rejects(err)

    this.RequestStub.originalUrl = '/kiosk/image.png'
    this.RequestStub.body = 'REQUEST BODY'
    await fn(Cast<Request>(this.RequestStub), Cast<Response>(this.ResponseStub))

    expect(this.RescaleImageStub?.callCount).to.equal(0)
    expect(this.SendImageStub?.callCount).to.equal(0)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.deep.equal([500])
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.deep.equal([
      {
        error: {
          code: 'EINTERNALERROR',
          message: 'Internal Server Error',
        },
      },
    ])
    expect(this.LoggerStub.callCount).to.equal(2)
    expect(this.LoggerStub.firstCall.args).to.deep.equal(['Error rendering: /kiosk/image.png', 'REQUEST BODY'])
    expect(this.LoggerStub.secondCall.args).to.have.lengthOf(1)
    expect(this.LoggerStub.secondCall.args[0]).to.equal(err)
  }
}
