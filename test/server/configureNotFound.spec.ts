'use sanity'

import type { Express, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import { configureNotFound } from '#server.js'

describe('Server configureNotFound', () => {
  let appStub = { use: vi.fn() }
  let appFake = cast<Express>(appStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  beforeEach(() => {
    appStub = { use: vi.fn() }
    appFake = cast<Express>(appStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  it('should register exactly one handler', () => {
    configureNotFound(appFake)
    expect(appStub.use.mock.calls.length).toBe(1)
  })

  const invoke = (originalUrl: string): void => {
    configureNotFound(appFake)
    const handler = cast<(req: Request, res: Response) => void>(appStub.use.mock.calls[0]?.[0])
    handler(cast<Request>({ originalUrl }), responseFake)
  }

  describe('for an unknown app route', () => {
    beforeEach(() => {
      invoke('/wat')
    })
    it('should set 404 status', () => {
      expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.NOT_FOUND])
    })
    it('should render the error template', () => {
      expect(responseStub.render.mock.calls[0]?.[0]).toBe('error')
    })
    it('should pass E_NOT_FOUND as code', () => {
      expect(responseStub.render.mock.calls[0]?.[1]).toHaveProperty('code', 'E_NOT_FOUND')
    })
    it('should include the requested URL in the message', () => {
      const data = cast<{ message: string }>(responseStub.render.mock.calls[0]?.[1])
      expect(data.message).toContain('/wat')
    })
  })

  const apiUrls = ['/api', '/api/', '/api/unknown', '/api/listing/foo/bar', '/api/listing.json']
  apiUrls.forEach((url) => {
    describe(`for api URL '${url}'`, () => {
      beforeEach(() => {
        invoke(url)
      })
      it('should set 404 status', () => {
        expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.NOT_FOUND])
      })
      it('should not render the error template', () => {
        expect(responseStub.render.mock.calls.length).toBe(0)
      })
      it('should send exactly one E_NOT_FOUND json error', () => {
        const codes = responseStub.json.mock.calls.map((c) => cast<{ error: { code: string } }>(c[0]).error.code)
        expect(codes).toEqual(['E_NOT_FOUND'])
      })
      it('should include the URL in the message', () => {
        const data = cast<{ error: { message: string } }>(responseStub.json.mock.calls[0]?.[0])
        expect(data.error.message).toContain(url)
      })
    })
  })

  describe("for a URL whose first segment looks like 'api' but isn't (e.g. '/apiary')", () => {
    beforeEach(() => {
      invoke('/apiary')
    })
    it('should render the error template (not JSON)', () => {
      expect(responseStub.render.mock.calls[0]?.[0]).toBe('error')
    })
  })

  const assetUrls: Array<[string, string]> = [
    ['by prefix only', '/scripts/noextension'],
    ['by prefix only', '/stylesheets/something/nested'],
    ['by prefix only', '/fonts/raw'],
    ['by prefix only', '/images/missing'],
    ['by prefix only', '/public/anything'],
    ['by prefix only', '/public/nested/path'],
    ['by extension only', '/notreally/anywhere/file.png'],
    ['by extension only', '/some/where/logo.svg'],
    ['by extension only', '/deep/nested/webfont.woff2'],
    ['by extension only', '/a/b/favicon.ico'],
    ['by prefix and extension', '/scripts/app.js'],
    ['by prefix and extension', '/scripts/app.js.map'],
    ['by prefix and extension', '/stylesheets/bundle.css'],
    ['by prefix and extension', '/fonts/font.woff2'],
  ]
  assetUrls.forEach(([kind, url]) => {
    describe(`for asset URL ${kind} '${url}'`, () => {
      beforeEach(() => {
        invoke(url)
      })
      it('should set 404 status', () => {
        expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.NOT_FOUND])
      })
      it('should respond with a bare 404 carrying no body', () => {
        expect({
          rendered: responseStub.render.mock.calls.length,
          jsoned: responseStub.json.mock.calls.length,
          ended: responseStub.end.mock.calls.length,
        }).toEqual({ rendered: 0, jsoned: 0, ended: 1 })
      })
    })
  })

  describe("for a URL whose first segment looks like an asset prefix but isn't (e.g. '/scriptsy')", () => {
    beforeEach(() => {
      invoke('/scriptsy')
    })
    it('should render the error template (not bare 404)', () => {
      expect(responseStub.render.mock.calls[0]?.[0]).toBe('error')
    })
  })

  describe('for an app route that happens to end in a non-asset suffix', () => {
    beforeEach(() => {
      invoke('/show/foo.png/bar')
    })
    it('should render the error template (not bare 404)', () => {
      expect(responseStub.render.mock.calls[0]?.[0]).toBe('error')
    })
  })
})
