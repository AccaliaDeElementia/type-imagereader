'use sanity'

import { decodeResult } from '#public/scripts/app/net.js'
import { cast } from '#testutils/typeGuards.js'

describe('public/app/net decodeResult()', () => {
  let response = cast<Response>(null)
  let contentLengthFake = '2'
  let dataFake: unknown = {}
  const isUnknown = (_: unknown): _ is unknown => true
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
  })
  it('should resolve to null for empty content with permissive type guard', async () => {
    contentLengthFake = '0'
    const result = await decodeResult(response, isUnknown)
    expect(result).toBe(null)
  })
  it('should reject for empty content with strict type guard with an Error', async () => {
    contentLengthFake = '0'
    await expect(decodeResult(response, (_): _ is never => false)).rejects.toBeInstanceOf(Error)
  })
  it('should reject for empty content with strict type guard with expected message', async () => {
    contentLengthFake = '0'
    await expect(decodeResult(response, (_): _ is never => false)).rejects.toHaveProperty(
      'message',
      'Empty JSON response received',
    )
  })
  it('should reject when data is an error with an Error', async () => {
    dataFake = { error: 'This is an Error! FOO!' }
    await expect(decodeResult(response, isUnknown)).rejects.toBeInstanceOf(Error)
  })
  it('should reject when data is an error with expected message', async () => {
    dataFake = { error: 'This is an Error! FOO!' }
    await expect(decodeResult(response, isUnknown)).rejects.toHaveProperty('message', 'This is an Error! FOO!')
  })
  it('should reject when isT does not validate with an Error', async () => {
    await expect(decodeResult(response, (_): _ is unknown => false)).rejects.toBeInstanceOf(Error)
  })
  it('should reject when isT does not validate with expected message', async () => {
    await expect(decodeResult(response, (_): _ is unknown => false)).rejects.toHaveProperty(
      'message',
      'Invalid JSON object decoded',
    )
  })
  it('should reject for null result with an Error', async () => {
    dataFake = null
    await expect(decodeResult(response, (_): _ is unknown => true)).rejects.toBeInstanceOf(Error)
  })
  it('should reject for null result with expected message', async () => {
    dataFake = null
    await expect(decodeResult(response, (_): _ is unknown => true)).rejects.toHaveProperty(
      'message',
      'Invalid JSON object decoded',
    )
  })
  it('should resolve to json data when data is valid', async () => {
    dataFake = { foo: 'bar', baz: Math.random() }
    const data = await decodeResult(response, isUnknown)
    expect(data).toBe(dataFake)
  })
})
