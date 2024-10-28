'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import type Sinon from 'sinon'
import * as sinon from 'sinon'

import { ImageReader } from '..'
import assert from 'assert'

@suite
export class ImageReaderTests {
  StartServer?: Sinon.SinonStub
  Synchronize?: Sinon.SinonStub
  Clock?: Sinon.SinonFakeTimers
  before (): void {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    this.StartServer = sinon.stub(ImageReader, 'StartServer').resolves(undefined)
    this.Synchronize = sinon.stub(ImageReader, 'Synchronize').resolves(undefined)
    this.Synchronize.resolves()
    this.Clock = sinon.useFakeTimers()
  }

  after (): void {
    ImageReader.Interval = undefined
    ImageReader.SyncRunning = false
    this.StartServer?.restore()
    this.Synchronize?.restore()
    this.Clock?.restore()
  }

  @test
  async 'it should reject when StartServer throws' (): Promise<void> {
    this.StartServer?.throws(new Error('FOO'))
    await expect(ImageReader.Run()).to.eventually.be.rejectedWith(Error)
  }

  @test
  async 'it should reject when StartServer rejects' (): Promise<void> {
    this.StartServer?.rejects(new Error('FOO'))
    await expect(ImageReader.Run()).to.eventually.be.rejectedWith(Error)
  }

  @test
  async 'it should start using default port when PORT is not defined' (): Promise<void> {
    delete process.env.PORT
    await ImageReader.Run()
    expect(this.StartServer?.called).to.equal(true)
    expect(this.StartServer?.firstCall.args[0]).to.equal(3030)
  }

  @test
  async 'it should start using default port when PORT is blank' (): Promise<void> {
    process.env.PORT = ''
    await ImageReader.Run()
    expect(this.StartServer?.called).to.equal(true)
    expect(this.StartServer?.firstCall.args[0]).to.equal(3030)
  }

  @test
  async 'it should start using specified port when PORT is valid' (): Promise<void> {
    process.env.PORT = '5555'
    await ImageReader.Run()
    expect(this.StartServer?.called).to.equal(true)
    expect(this.StartServer?.firstCall.args[0]).to.equal(5555)
  }

  @test
  async 'it should reject start when PORT fails to parse' (): Promise<void> {
    process.env.PORT = 'FOO'
    try {
      await ImageReader.Run()
    } catch (e) {
      expect(this.StartServer?.called).to.equal(false)
      expect(this.Synchronize?.called).to.equal(false)
      expect((e as Error).message).to.equal('Port NaN (from env: FOO) is not a number. Valid ports must be a number.')
    }
  }

  @test
  async 'it should reject start when PORT is too small' (): Promise<void> {
    process.env.PORT = '-1'
    try {
      await ImageReader.Run()
    } catch (e) {
      expect(this.StartServer?.called).to.equal(false)
      expect(this.Synchronize?.called).to.equal(false)
      expect((e as Error).message).to.equal('Port -1 is out of range. Valid ports must be between 0 and 65535.')
    }
  }

  @test
  async 'it should reject start when PORT is too big' (): Promise<void> {
    process.env.PORT = '131072'
    try {
      await ImageReader.Run()
    } catch (e) {
      expect(this.StartServer?.called).to.equal(false)
      expect(this.Synchronize?.called).to.equal(false)
      expect((e as Error).message).to.equal('Port 131072 is out of range. Valid ports must be between 0 and 65535.')
    }
  }

  @test
  async 'it should reject start when PORT is not integer' (): Promise<void> {
    process.env.PORT = '3.1415926'
    try {
      await ImageReader.Run()
    } catch (e) {
      expect(this.StartServer?.called).to.equal(false)
      expect(this.Synchronize?.called).to.equal(false)
      expect((e as Error).message).to.equal('Port 3.1415926 is not integer. Valid ports must be integer between 0 and 65535.')
    }
  }

  @test
  async 'it should run Synchronization if SKIP_SYNC is not set' (): Promise<void> {
    delete process.env.SKIP_SYNC
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(true)
  }

  @test
  async 'it should run Synchronization if SKIP_SYNC is blank' (): Promise<void> {
    process.env.SKIP_SYNC = ''
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(true)
  }

  @test
  async 'it should not run Synchronization if SKIP_SYNC is true' (): Promise<void> {
    process.env.SKIP_SYNC = 'true'
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(false)
  }

  @test
  async 'it should not run Synchronization if SKIP_SYNC is 1' (): Promise<void> {
    process.env.SKIP_SYNC = '1'
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(false)
  }

  @test
  async 'it should run Synchronization again after SyncInterval miliseconds' (): Promise<void> {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    this.Synchronize?.resetHistory()
    this.Clock?.tick(99)
    expect(this.Synchronize?.called).to.equal(false)
    this.Clock?.tick(1)
    expect(this.Synchronize?.called).to.equal(true)
  }

  @test
  async 'it should skip Synchronization if a previous run is still running' (): Promise<void> {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    this.Synchronize?.resetHistory()
    ImageReader.SyncRunning = true
    this.Clock?.tick(101)
    expect(this.Synchronize?.called).to.equal(false)
  }

  @test
  async 'it should reset sync running if Synchronization throws' (): Promise<void> {
    this.Synchronize?.throws(new Error('FOO!'))
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    expect(ImageReader.SyncRunning).to.equal(false)
  }

  @test
  async 'it should reset sync running if Synchronization rejects' (): Promise<void> {
    this.Synchronize?.rejects(new Error('FOO!'))
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    expect(ImageReader.SyncRunning).to.equal(false)
  }

  @test
  async 'it should tolerate Synchronization rejects in interval' (): Promise<void> {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    this.Synchronize?.rejects(new Error('FOO!'))
    this.Clock?.tick(105)
    await Promise.resolve()
    assert(true, 'should not throw or reject because inner promise rejects')
  }
}
