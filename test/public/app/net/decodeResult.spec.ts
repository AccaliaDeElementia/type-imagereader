'use sanity'

import { expect } from 'chai'
import { decodeResult } from '#public/scripts/app/net.js'
import { Cast } from '#testutils/TypeGuards.js'
import { EventuallyRejects } from '#testutils/Errors.js'

describe('public/app/net function decodeResult()', () => {
  let response = Cast<Response>(null)
  let contentLengthFake = '2'
  let dataFake: unknown = {}
  const isUnknown = (_: unknown): _ is unknown => true
  beforeEach(() => {
    contentLengthFake = '2'
    dataFake = {}
    response = Cast<Response>({
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
    expect(result).to.equal(null)
  })
  it('should reject for empty content with strict type guard with an Error', async () => {
    contentLengthFake = '0'
    const err = await EventuallyRejects(decodeResult(response, (_): _ is never => false))
    expect(err).to.be.an.instanceOf(Error)
  })
  it('should reject for empty content with strict type guard with expected message', async () => {
    contentLengthFake = '0'
    const err = await EventuallyRejects(decodeResult(response, (_): _ is never => false))
    expect(err.message).to.equal('Empty JSON response received')
  })
  it('should reject when data is an error with an Error', async () => {
    dataFake = { error: 'This is an Error! FOO!' }
    const err = await EventuallyRejects(decodeResult(response, isUnknown))
    expect(err).to.be.an.instanceOf(Error)
  })
  it('should reject when data is an error with expected message', async () => {
    dataFake = { error: 'This is an Error! FOO!' }
    const err = await EventuallyRejects(decodeResult(response, isUnknown))
    expect(err.message).to.equal('This is an Error! FOO!')
  })
  it('should reject when isT does not validate with an Error', async () => {
    const err = await EventuallyRejects(decodeResult(response, (_): _ is unknown => false))
    expect(err).to.be.an.instanceOf(Error)
  })
  it('should reject when isT does not validate with expected message', async () => {
    const err = await EventuallyRejects(decodeResult(response, (_): _ is unknown => false))
    expect(err.message).to.equal('Invalid JSON object decoded')
  })
  it('should reject for null result with an Error', async () => {
    dataFake = null
    const err = await EventuallyRejects(decodeResult(response, (_): _ is unknown => true))
    expect(err).to.be.an.instanceOf(Error)
  })
  it('should reject for null result with expected message', async () => {
    dataFake = null
    const err = await EventuallyRejects(decodeResult(response, (_): _ is unknown => true))
    expect(err.message).to.equal('Invalid JSON object decoded')
  })
  it('should resolve to json data when data is valid', async () => {
    dataFake = { foo: 'bar', baz: Math.random() }
    const data = await decodeResult(response, isUnknown)
    expect(data).to.equal(dataFake)
  })
})
