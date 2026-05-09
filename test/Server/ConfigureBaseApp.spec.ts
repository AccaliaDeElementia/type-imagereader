'use sanity'

import { expect } from 'chai'
import type { Express } from 'express'
import express from 'express'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards.js'
import { ConfigureBaseApp, Imports } from '#Server.js'

const sandbox = Sinon.createSandbox()

describe('Server function ConfigureBaseApp', () => {
  let jsonifyStub = sandbox.stub().returns({})
  let urlEncoderStub = sandbox.stub().returns({})
  let cookieParserStub = sandbox.stub().returns({})
  let faviconStub = sandbox.stub().returns({})
  let loggerStub = sandbox.stub()
  let appStub = { use: sandbox.stub() }
  let appFake = Cast<Express>(appStub)
  const FAVICON_ERROR_MESSAGE = "ENOENT: no such file or directory, stat '/app/dist/images/favicon.ico'"
  const isErrorInstance = (a: unknown): boolean => a instanceof Error
  beforeEach(() => {
    jsonifyStub = sandbox.stub(express, 'json')
    urlEncoderStub = sandbox.stub(express, 'urlencoded')
    cookieParserStub = sandbox.stub(Imports, 'cookieParser')
    faviconStub = sandbox.stub(Imports, 'favicon')
    loggerStub = sandbox.stub(Imports, 'logger')
    appStub = { use: sandbox.stub() }
    appFake = Cast<Express>(appStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should use correct count of extensions', () => {
    ConfigureBaseApp(appFake)
    expect(appStub.use.callCount).to.equal(4)
  })
  it('should configure jsonify', () => {
    ConfigureBaseApp(appFake)
    expect(jsonifyStub.callCount).to.equal(1)
  })
  it('should configure jsonify without config options', () => {
    ConfigureBaseApp(appFake)
    expect(jsonifyStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should app.use result of jsonify', () => {
    const jsonify = {}
    jsonifyStub.returns(jsonify)
    ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(jsonify)).to.equal(true)
  })
  it('should configure urlencoded', () => {
    ConfigureBaseApp(appFake)
    expect(urlEncoderStub.callCount).to.equal(1)
  })
  it('should configure urlencoded with custom config', () => {
    ConfigureBaseApp(appFake)
    expect(urlEncoderStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should configure urlencoded with extended encodings', () => {
    ConfigureBaseApp(appFake)
    expect(urlEncoderStub.firstCall.args[0]).to.deep.equal({ extended: true })
  })
  it('should app.use result of urlencoded', () => {
    const encoded = {}
    urlEncoderStub.returns(encoded)
    ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(encoded)).to.equal(true)
  })
  it('should configure cookieParser', () => {
    ConfigureBaseApp(appFake)
    expect(cookieParserStub.callCount).to.equal(1)
  })
  it('should configure cookieParser with custom config', () => {
    ConfigureBaseApp(appFake)
    expect(cookieParserStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should app.use result of cookieParser', () => {
    const cookies = {}
    cookieParserStub.returns(cookies)
    ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(cookies)).to.equal(true)
  })
  it('should configure favicon', () => {
    ConfigureBaseApp(appFake)
    expect(faviconStub.callCount).to.equal(1)
  })
  it('should configure favicon with custom config', () => {
    ConfigureBaseApp(appFake)
    expect(faviconStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should configure favicon with extended encodings', () => {
    ConfigureBaseApp(appFake)
    expect(faviconStub.firstCall.args[0]).to.equal(`${Imports.dirname}/dist/images/favicon.ico`)
  })
  it('should app.use result of favicon', () => {
    const favicon = {}
    faviconStub.returns(favicon)
    ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(favicon)).to.equal(true)
  })

  it('should not throw when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    const action = (): void => {
      ConfigureBaseApp(appFake)
    }
    expect(action).to.not.throw()
  })

  it('should not register favicon middleware when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    ConfigureBaseApp(appFake)
    expect(appStub.use.callCount).to.equal(3)
  })

  it('should log skipped-format when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    ConfigureBaseApp(appFake)
    expect(loggerStub.firstCall.args[0]).to.equal('favicon middleware skipped: %s')
  })

  it('should pass the error message string when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    ConfigureBaseApp(appFake)
    expect(loggerStub.firstCall.args[1]).to.equal(FAVICON_ERROR_MESSAGE)
  })

  it('should not include any Error instance in log args when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    ConfigureBaseApp(appFake)
    const hasErrorArg = loggerStub.firstCall.args.some(isErrorInstance)
    expect(hasErrorArg).to.equal(false)
  })

  it('should still register the other three middlewares when favicon registration fails', () => {
    faviconStub.throws(new Error(FAVICON_ERROR_MESSAGE))
    ConfigureBaseApp(appFake)
    expect(jsonifyStub.callCount + urlEncoderStub.callCount + cookieParserStub.callCount).to.equal(3)
  })

  it('should coerce non-Error throws to a string in the log', () => {
    faviconStub.throws(Cast<Error>({ toString: () => 'plain-rejection' }))
    ConfigureBaseApp(appFake)
    expect(loggerStub.firstCall.args[1]).to.equal('plain-rejection')
  })
})
