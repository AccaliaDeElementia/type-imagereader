'use sanity'

import type { Express } from 'express'
import express from 'express'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { configureBaseApp, Imports } from '#server.js'

const sandbox = Sinon.createSandbox()

describe('Server configureBaseApp', () => {
  let jsonifyStub = sandbox.stub().returns({})
  let urlEncoderStub = sandbox.stub().returns({})
  let cookieParserStub = sandbox.stub().returns({})
  let faviconStub = sandbox.stub().returns({})
  let loggerStub = sandbox.stub()
  let appStub = { use: sandbox.stub() }
  let appFake = cast<Express>(appStub)
  const FAVICON_ERROR_MESSAGE = "ENOENT: no such file or directory, stat '/app/dist/images/favicon.ico'"
  const isErrorInstance = (a: unknown): boolean => a instanceof Error
  beforeEach(() => {
    jsonifyStub = sandbox.stub(express, 'json')
    urlEncoderStub = sandbox.stub(express, 'urlencoded')
    cookieParserStub = sandbox.stub(Imports, 'cookieParser')
    faviconStub = sandbox.stub(Imports, 'favicon')
    loggerStub = sandbox.stub(Imports, 'logger')
    appStub = { use: sandbox.stub() }
    appFake = cast<Express>(appStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should use correct count of extensions', () => {
    configureBaseApp(appFake)
    expect(appStub.use.callCount).toBe(4)
  })
  it('should configure jsonify', () => {
    configureBaseApp(appFake)
    expect(jsonifyStub.callCount).toBe(1)
  })
  it('should configure jsonify without config options', () => {
    configureBaseApp(appFake)
    expect(jsonifyStub.firstCall.args).toHaveLength(0)
  })
  it('should app.use result of jsonify', () => {
    const jsonify = {}
    jsonifyStub.returns(jsonify)
    configureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(jsonify)).toBe(true)
  })
  it('should configure urlencoded', () => {
    configureBaseApp(appFake)
    expect(urlEncoderStub.callCount).toBe(1)
  })
  it('should configure urlencoded with custom config', () => {
    configureBaseApp(appFake)
    expect(urlEncoderStub.firstCall.args).toHaveLength(1)
  })
  it('should configure urlencoded with extended encodings', () => {
    configureBaseApp(appFake)
    expect(urlEncoderStub.firstCall.args[0]).toEqual({ extended: true })
  })
  it('should app.use result of urlencoded', () => {
    const encoded = {}
    urlEncoderStub.returns(encoded)
    configureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(encoded)).toBe(true)
  })
  it('should configure cookieParser', () => {
    configureBaseApp(appFake)
    expect(cookieParserStub.callCount).toBe(1)
  })
  it('should configure cookieParser with custom config', () => {
    configureBaseApp(appFake)
    expect(cookieParserStub.firstCall.args).toHaveLength(0)
  })
  it('should app.use result of cookieParser', () => {
    const cookies = {}
    cookieParserStub.returns(cookies)
    configureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(cookies)).toBe(true)
  })
  it('should configure favicon', () => {
    configureBaseApp(appFake)
    expect(faviconStub.callCount).toBe(1)
  })
  it('should configure favicon with custom config', () => {
    configureBaseApp(appFake)
    expect(faviconStub.firstCall.args).toHaveLength(1)
  })
  it('should configure favicon with extended encodings', () => {
    configureBaseApp(appFake)
    expect(faviconStub.firstCall.args[0]).toBe(`${Imports.dirname}/dist/images/favicon.ico`)
  })
  it('should app.use result of favicon', () => {
    const favicon = {}
    faviconStub.returns(favicon)
    configureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(favicon)).toBe(true)
  })

  it('should not throw when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    const action = (): void => {
      configureBaseApp(appFake)
    }
    expect(action).not.toThrow()
  })

  it('should not register favicon middleware when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    configureBaseApp(appFake)
    expect(appStub.use.callCount).toBe(3)
  })

  it('should log skipped-format when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    configureBaseApp(appFake)
    expect(loggerStub.firstCall.args[0]).toBe('favicon middleware skipped: %s')
  })

  it('should pass the error message string when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    configureBaseApp(appFake)
    expect(loggerStub.firstCall.args[1]).toBe(FAVICON_ERROR_MESSAGE)
  })

  it('should not include any Error instance in log args when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    configureBaseApp(appFake)
    const hasErrorArg = loggerStub.firstCall.args.some(isErrorInstance)
    expect(hasErrorArg).toBe(false)
  })

  it('should still register the other three middlewares when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    configureBaseApp(appFake)
    expect(jsonifyStub.callCount + urlEncoderStub.callCount + cookieParserStub.callCount).toBe(3)
  })

  it('should coerce non-Error throws to a string in the log', () => {
    faviconStub.throws(cast<Error>({ toString: () => 'plain-rejection' }))
    configureBaseApp(appFake)
    expect(loggerStub.firstCall.args[1]).toBe('plain-rejection')
  })
})
