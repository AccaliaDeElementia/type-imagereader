'use sanity'

import assert from 'assert'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import type Sinon from 'sinon'
import * as sinon from 'sinon'
import { EventuallyRejects } from './testutils/Errors'

import { ImageReader } from '..'

describe('/index.ts tests', (): void => {
  let StartServerStub: Sinon.SinonStub | undefined = undefined
  let SynchronizeStub: Sinon.SinonStub | undefined = undefined
  let ClockFake: Sinon.SinonFakeTimers | undefined = undefined

  beforeEach(() => {
    delete process.env.PORT
    delete process.env.SKIP_SYNC
    StartServerStub = sinon.stub(ImageReader, 'StartServer').resolves()
    SynchronizeStub = sinon.stub(ImageReader, 'Synchronize').resolves()
    ClockFake = sinon.useFakeTimers()
  })

  afterEach(() => {
    ImageReader.Interval = undefined
    ImageReader.SyncRunning = false
    StartServerStub?.restore()
    SynchronizeStub?.restore()
    ClockFake?.restore()
  })

  it('should reject when StartServer throws', async () => {
    StartServerStub?.throws(new Error('FOO'))
    const err = await EventuallyRejects(ImageReader.Run())
    expect(err).to.be.instanceOf(Error)
    expect(err.message).to.equal('FOO')
  })

  it('should reject when StartServer rejects', async () => {
    StartServerStub?.rejects(new Error('FOO'))
    const err = await EventuallyRejects(ImageReader.Run())
    expect(err).to.be.instanceOf(Error)
    expect(err.message).to.equal('FOO')
  })

  it('should start using default port when PORT is not defined', async () => {
    delete process.env.PORT
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
    expect(StartServerStub?.firstCall.args[0]).to.equal(3030)
  })

  it('should start using default port when PORT is blank', async () => {
    process.env.PORT = ''
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
    expect(StartServerStub?.firstCall.args[0]).to.equal(3030)
  })

  it('should start using specified port when PORT is valid', async () => {
    process.env.PORT = '5555'
    await ImageReader.Run()
    expect(StartServerStub?.called).to.equal(true)
    expect(StartServerStub?.firstCall.args[0]).to.equal(5555)
  })

  it('should reject start when PORT fails to parse', async () => {
    process.env.PORT = 'FOO'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
    expect(SynchronizeStub?.called).to.equal(false)
    expect(e.message).to.equal('Port NaN (from env: FOO) is not a number. Valid ports must be a number.')
  })

  it('should reject start when PORT is too small', async () => {
    process.env.PORT = '-1'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
    expect(SynchronizeStub?.called).to.equal(false)
    expect(e.message).to.equal('Port -1 is out of range. Valid ports must be between 0 and 65535.')
  })

  it('should reject start when PORT is too big', async () => {
    process.env.PORT = '131072'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
    expect(SynchronizeStub?.called).to.equal(false)
    expect(e.message).to.equal('Port 131072 is out of range. Valid ports must be between 0 and 65535.')
  })

  it('should reject start when PORT is not integer', async () => {
    process.env.PORT = '3.1415926'
    const e = await EventuallyRejects(ImageReader.Run())
    expect(StartServerStub?.called).to.equal(false)
    expect(SynchronizeStub?.called).to.equal(false)
    expect(e.message).to.equal('Port 3.1415926 is not integer. Valid ports must be integer between 0 and 65535.')
  })

  it('should run Synchronization if SKIP_SYNC is not set', async () => {
    delete process.env.SKIP_SYNC
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should run Synchronization if SKIP_SYNC is blank', async () => {
    process.env.SKIP_SYNC = ''
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should not run Synchronization if SKIP_SYNC is true', async () => {
    process.env.SKIP_SYNC = 'true'
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should not run Synchronization if SKIP_SYNC is 1', async () => {
    process.env.SKIP_SYNC = '1'
    await ImageReader.Run()
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should run Synchronization again after SyncInterval miliseconds', async () => {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    SynchronizeStub?.resetHistory()
    ClockFake?.tick(99)
    expect(SynchronizeStub?.called).to.equal(false)
    ClockFake?.tick(1)
    expect(SynchronizeStub?.called).to.equal(true)
  })

  it('should skip Synchronization if a previous run is still running', async () => {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    SynchronizeStub?.resetHistory()
    ImageReader.SyncRunning = true
    ClockFake?.tick(101)
    expect(SynchronizeStub?.called).to.equal(false)
  })

  it('should reset sync running if Synchronization throws', async () => {
    SynchronizeStub?.throws(new Error('FOO!'))
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    expect(ImageReader.SyncRunning).to.equal(false)
  })

  it('should reset sync running if Synchronization rejects', async () => {
    SynchronizeStub?.rejects(new Error('FOO!'))
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    expect(ImageReader.SyncRunning).to.equal(false)
  })

  it('should tolerate Synchronization rejects in interval', async () => {
    ImageReader.SyncInterval = 100
    await ImageReader.Run()
    SynchronizeStub?.rejects(new Error('FOO!'))
    ClockFake?.tick(105)
    await Promise.resolve()
    assert(true, 'should not throw or reject because inner promise rejects')
  })
})
