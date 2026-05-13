'use sanity'

import type { Express } from 'express'
import express from 'express'
import { cast } from '#testutils/typeGuards.js'
import { configureBaseApp, Imports } from '#server.js'
import type { MockInstance } from 'vitest'

describe('Server configureBaseApp', () => {
  let jsonifyStub = vi.fn().mockReturnValue({})
  let urlEncoderStub = vi.fn().mockReturnValue({})
  let cookieParserStub = vi.fn().mockReturnValue({})
  let faviconStub = vi.fn().mockReturnValue({})
  let loggerStub: MockInstance = vi.fn()
  let appStub = { use: vi.fn() }
  let appFake = cast<Express>(appStub)
  const FAVICON_ERROR_MESSAGE = "ENOENT: no such file or directory, stat '/app/dist/images/favicon.ico'"
  const isErrorInstance = (a: unknown): boolean => a instanceof Error
  beforeEach(() => {
    jsonifyStub = vi.spyOn(express, 'json').mockImplementation(cast(() => undefined))
    urlEncoderStub = vi.spyOn(express, 'urlencoded').mockImplementation(cast(() => undefined))
    cookieParserStub = vi.spyOn(Imports, 'cookieParser').mockImplementation(cast(() => undefined))
    faviconStub = vi.spyOn(Imports, 'favicon').mockImplementation(cast(() => undefined))
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation(cast(() => undefined))
    appStub = { use: vi.fn() }
    appFake = cast<Express>(appStub)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should use correct count of extensions', () => {
    configureBaseApp(appFake)
    expect(appStub.use.mock.calls.length).toBe(4)
  })
  it('should configure jsonify', () => {
    configureBaseApp(appFake)
    expect(jsonifyStub.mock.calls.length).toBe(1)
  })
  it('should configure jsonify without config options', () => {
    configureBaseApp(appFake)
    expect(jsonifyStub.mock.calls[0]).toHaveLength(0)
  })
  it('should app.use result of jsonify', () => {
    const jsonify = {}
    jsonifyStub.mockReturnValue(jsonify)
    configureBaseApp(appFake)
    expect(appStub.use).toHaveBeenCalledWith(jsonify)
  })
  it('should configure urlencoded', () => {
    configureBaseApp(appFake)
    expect(urlEncoderStub.mock.calls.length).toBe(1)
  })
  it('should configure urlencoded with custom config', () => {
    configureBaseApp(appFake)
    expect(urlEncoderStub.mock.calls[0]).toHaveLength(1)
  })
  it('should configure urlencoded with extended encodings', () => {
    configureBaseApp(appFake)
    expect(urlEncoderStub.mock.calls[0]?.[0]).toEqual({ extended: true })
  })
  it('should app.use result of urlencoded', () => {
    const encoded = {}
    urlEncoderStub.mockReturnValue(encoded)
    configureBaseApp(appFake)
    expect(appStub.use).toHaveBeenCalledWith(encoded)
  })
  it('should configure cookieParser', () => {
    configureBaseApp(appFake)
    expect(cookieParserStub.mock.calls.length).toBe(1)
  })
  it('should configure cookieParser with custom config', () => {
    configureBaseApp(appFake)
    expect(cookieParserStub.mock.calls[0]).toHaveLength(0)
  })
  it('should app.use result of cookieParser', () => {
    const cookies = {}
    cookieParserStub.mockReturnValue(cookies)
    configureBaseApp(appFake)
    expect(appStub.use).toHaveBeenCalledWith(cookies)
  })
  it('should configure favicon', () => {
    configureBaseApp(appFake)
    expect(faviconStub.mock.calls.length).toBe(1)
  })
  it('should configure favicon with custom config', () => {
    configureBaseApp(appFake)
    expect(faviconStub.mock.calls[0]).toHaveLength(1)
  })
  it('should configure favicon with extended encodings', () => {
    configureBaseApp(appFake)
    expect(faviconStub.mock.calls[0]?.[0]).toBe(`${Imports.dirname}/dist/images/favicon.ico`)
  })
  it('should app.use result of favicon', () => {
    const favicon = {}
    faviconStub.mockReturnValue(favicon)
    configureBaseApp(appFake)
    expect(appStub.use).toHaveBeenCalledWith(favicon)
  })

  it('should not throw when favicon registration fails', () => {
    faviconStub.mockImplementation(() => {
      throw new Error(FAVICON_ERROR_MESSAGE)
    })
    const action = (): void => {
      configureBaseApp(appFake)
    }
    expect(action).not.toThrow()
  })

  it('should not register favicon middleware when favicon registration fails', () => {
    faviconStub.mockImplementation(() => {
      throw new Error(FAVICON_ERROR_MESSAGE)
    })
    configureBaseApp(appFake)
    expect(appStub.use.mock.calls.length).toBe(3)
  })

  it('should log skipped-format when favicon registration fails', () => {
    faviconStub.mockImplementation(() => {
      throw new Error(FAVICON_ERROR_MESSAGE)
    })
    configureBaseApp(appFake)
    expect(loggerStub.mock.calls[0]?.[0]).toBe('favicon middleware skipped: %s')
  })

  it('should pass the error message string when favicon registration fails', () => {
    faviconStub.mockImplementation(() => {
      throw new Error(FAVICON_ERROR_MESSAGE)
    })
    configureBaseApp(appFake)
    expect(loggerStub.mock.calls[0]?.[1]).toBe(FAVICON_ERROR_MESSAGE)
  })

  it('should not include any Error instance in log args when favicon registration fails', () => {
    faviconStub.mockImplementation(() => {
      throw new Error(FAVICON_ERROR_MESSAGE)
    })
    configureBaseApp(appFake)
    const hasErrorArg = loggerStub.mock.calls[0]?.some(isErrorInstance) ?? false
    expect(hasErrorArg).toBe(false)
  })

  it('should still register the other three middlewares when favicon registration fails', () => {
    faviconStub.mockImplementation(() => {
      throw new Error(FAVICON_ERROR_MESSAGE)
    })
    configureBaseApp(appFake)
    expect(jsonifyStub.mock.calls.length + urlEncoderStub.mock.calls.length + cookieParserStub.mock.calls.length).toBe(
      3,
    )
  })

  it('should coerce non-Error throws to a string in the log', () => {
    faviconStub.mockImplementation(() => {
      throw cast<Error>({ toString: () => 'plain-rejection' })
    })
    configureBaseApp(appFake)
    expect(loggerStub.mock.calls[0]?.[1]).toBe('plain-rejection')
  })
})
