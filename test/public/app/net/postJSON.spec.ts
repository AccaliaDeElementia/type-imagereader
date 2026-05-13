'use sanity'

import { postJSON } from '#public/scripts/app/net.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'
interface TestRequest {
  method: string
  body: string
  headers: Record<string, string>
}

describe('public/app/net postJSON()', () => {
  let response = cast<Response>(null)
  let contentLengthFake = '2'
  let dataFake: Record<string, number> = {}
  const isUnknown = (_: unknown): _ is unknown => true
  let fetchStub: MockInstance = vi.fn()
  beforeEach(() => {
    contentLengthFake = '2'
    dataFake = {}
    response = cast<Response>({
      headers: {
        get: (name: string): string | undefined => {
          if (name === 'content-length') return contentLengthFake
          return undefined
        },
      },
      json: async () => await Promise.resolve(dataFake),
    })
    fetchStub = vi.spyOn(global, 'fetch').mockResolvedValue(response)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call fetch with provided path', async () => {
    const path = `/Some/Test/Path/${Math.random()}`
    await postJSON(path, {}, isUnknown)
    expect(fetchStub).toHaveBeenCalledWith(path, expect.anything())
  })
  it('should use POST method', async () => {
    await postJSON('/foo', {}, isUnknown)
    const req = cast<TestRequest>(fetchStub.mock.calls[0]?.[1])
    expect(req.method).toBe('POST')
  })
  it('should set only expected headers', async () => {
    await postJSON('', {}, isUnknown)
    const req = cast<TestRequest>(fetchStub.mock.calls[0]?.[1])
    expect(Object.keys(req.headers).sort()).toEqual(['Content-Type', 'Accept-Encoding', 'Accept'].sort())
  })
  const headerTests: Array<[string, string, string]> = [
    ['Accept-Encoding', 'Accept-Encoding', 'gzip, deflate, br'],
    ['Accept', 'Accept', 'application/json'],
    ['Content-Type', 'Content-Type', 'application/json'],
  ]
  headerTests.forEach(([title, header, expected]) => {
    it(`should set ${title} header`, async () => {
      await postJSON('/foo', {}, isUnknown)
      const req = cast<TestRequest>(fetchStub.mock.calls[0]?.[1])
      expect(req.headers[header]).toBe(expected)
    })
  })
  it('should set body in request', async () => {
    await postJSON('', { foo: 4, bar: false, baz: 'quux' }, isUnknown)
    const req = cast<TestRequest>(fetchStub.mock.calls[0]?.[1])
    expect(req.body).toBe('{"foo":4,"bar":false,"baz":"quux"}')
  })
  it('should resolve to expected object', async () => {
    dataFake.foo = Math.random()
    const result = await postJSON('', {}, isUnknown)
    expect(result).toBe(dataFake)
  })
})
