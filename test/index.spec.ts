'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { ImageReader } from '..'

@suite
export class ImageReaderTests {
  StartServer?: Sinon.SinonStub
  Synchronize?: Sinon.SinonStub
  Clock?: Sinon.SinonFakeTimers
  before () {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    this.StartServer = sinon.stub(ImageReader, 'StartServer')
    this.Synchronize = sinon.stub(ImageReader, 'Synchronize')
    this.Synchronize.resolves()
    this.Clock = sinon.useFakeTimers()
  }

  after () {
    ImageReader.Interval = undefined
    ImageReader.SyncRunning = false
    this.StartServer?.restore()
    this.Synchronize?.restore()
    this.Clock?.restore()
  }

  @test
  async 'it should start using default port when PORT is not defined' () {
    delete process.env.PORT
    await ImageReader.Run()
    expect(this.StartServer?.called).to.equal(true)
    expect(this.StartServer?.firstCall.args[0]).to.equal(3030)
  }

  @test
  async 'it should start using default port when PORT is blank' () {
    process.env.PORT = ''
    await ImageReader.Run()
    expect(this.StartServer?.called).to.equal(true)
    expect(this.StartServer?.firstCall.args[0]).to.equal(3030)
  }

  @test
  async 'it should start using specified port when PORT is valid' () {
    process.env.PORT = '5555'
    await ImageReader.Run()
    expect(this.StartServer?.called).to.equal(true)
    expect(this.StartServer?.firstCall.args[0]).to.equal(5555)
  }

  @test
  async 'it should reject start when PORT fails to parse' () {
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
  async 'it should reject start when PORT is too small' () {
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
  async 'it should reject start when PORT is too big' () {
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
  async 'it should reject start when PORT is not integer' () {
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
  async 'it should run Synchronization if SKIP_SYNC is not set' () {
    delete process.env.SKIP_SYNC
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(true)
  }

  @test
  async 'it should run Synchronization if SKIP_SYNC is blank' () {
    process.env.SKIP_SYNC = ''
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(true)
  }

  @test
  async 'it should run Synchronization if SKIP_SYNC is true' () {
    process.env.SKIP_SYNC = 'true'
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(false)
  }

  @test
  async 'it should run Synchronization if SKIP_SYNC is 1' () {
    process.env.SKIP_SYNC = '1'
    await ImageReader.Run()
    expect(this.Synchronize?.called).to.equal(false)
  }

  @test
  async 'it should run Synchronization again after SyncInterval miliseconds' () {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    this.Synchronize?.resetHistory()
    this.Clock?.tick(99)
    expect(this.Synchronize?.called).to.equal(false)
    this.Clock?.tick(1)
    expect(this.Synchronize?.called).to.equal(true)
  }

  @test
  async 'it should skip Synchronization if a previous run is still running' () {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    this.Synchronize?.resetHistory()
    ImageReader.SyncRunning = true
    this.Clock?.tick(101)
    expect(this.Synchronize?.called).to.equal(false)
  }
}
