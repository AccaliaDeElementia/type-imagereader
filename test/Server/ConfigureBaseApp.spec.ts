'use sanity'

import { expect } from 'chai'
import type { Express } from 'express'
import express from 'express'
import Sinon from 'sinon'
import { Cast } from '../testutils/TypeGuards'
import { Functions, Imports } from '../../Server'

describe('Server function ConfigureBaseApp', () => {
  let jsonifyStub = Sinon.stub().returns({})
  let urlEncoderStub = Sinon.stub().returns({})
  let cookieParserStub = Sinon.stub().returns({})
  let faviconStub = Sinon.stub().returns({})
  let appStub = { use: Sinon.stub() }
  let appFake = Cast<Express>(appStub)
  beforeEach(() => {
    jsonifyStub = Sinon.stub(express, 'json')
    urlEncoderStub = Sinon.stub(express, 'urlencoded')
    cookieParserStub = Sinon.stub(Imports, 'cookieParser')
    faviconStub = Sinon.stub(Imports, 'favicon')
    appStub = { use: Sinon.stub() }
    appFake = Cast<Express>(appStub)
  })
  afterEach(() => {
    jsonifyStub.restore()
    urlEncoderStub.restore()
    cookieParserStub.restore()
    faviconStub.restore()
  })
  it('should use correct count of extensions', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(appStub.use.callCount).to.equal(4)
  })
  it('should configure jsonify', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(jsonifyStub.callCount).to.equal(1)
  })
  it('should configure jsonify without config options', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(jsonifyStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should app.use result of jsonify', () => {
    const jsonify = {}
    jsonifyStub.returns(jsonify)
    Functions.ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(jsonify)).to.equal(true)
  })
  it('should configure urlencoded', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(urlEncoderStub.callCount).to.equal(1)
  })
  it('should configure urlencoded with custom config', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(urlEncoderStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should configure urlencoded with extended encodings', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(urlEncoderStub.firstCall.args[0]).to.deep.equal({ extended: true })
  })
  it('should app.use result of urlencoded', () => {
    const encoded = {}
    urlEncoderStub.returns(encoded)
    Functions.ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(encoded)).to.equal(true)
  })
  it('should configure cookieParser', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(cookieParserStub.callCount).to.equal(1)
  })
  it('should configure cookieParser with custom config', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(cookieParserStub.firstCall.args).to.have.lengthOf(0)
  })
  it('should app.use result of cookieParser', () => {
    const cookies = {}
    cookieParserStub.returns(cookies)
    Functions.ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(cookies)).to.equal(true)
  })
  it('should configure favicon', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(faviconStub.callCount).to.equal(1)
  })
  it('should configure favicon with custom config', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(faviconStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should configure favicon with extended encodings', () => {
    Functions.ConfigureBaseApp(appFake)
    expect(faviconStub.firstCall.args[0]).to.equal(Imports.dirname + '/public/images/favicon.ico')
  })
  it('should app.use result of favicon', () => {
    const favicon = {}
    faviconStub.returns(favicon)
    Functions.ConfigureBaseApp(appFake)
    expect(appStub.use.calledWithExactly(favicon)).to.equal(true)
  })
})
