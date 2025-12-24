'use sanity'

import { expect } from 'chai'
import { decodeResult } from '../../../../public/scripts/app/net'
import { Cast } from '../../../testutils/TypeGuards'
import { EventuallyRejects } from '../../../testutils/Errors'

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
  it('should reject for empty content', async () => {
    contentLengthFake = '0'
    const err = await EventuallyRejects(decodeResult(response, isUnknown))
    expect(err).to.be.an.instanceOf(Error)
    expect(err.message).to.equal('Empty JSON response recieved')
  })
  it('should reject when data is an error', async () => {
    dataFake = { error: 'This is an Error! FOO!' }
    const err = await EventuallyRejects(decodeResult(response, isUnknown))
    expect(err).to.be.an.instanceOf(Error)
    expect(err.message).to.equal('This is an Error! FOO!')
  })
  it('should reject when isT does not validate json result', async () => {
    const err = await EventuallyRejects(decodeResult(response, (_): _ is unknown => false))
    expect(err).to.be.an.instanceOf(Error)
    expect(err.message).to.equal('Invalid JSON object decoded')
  })
  it('should reject for null result even if isT accepts null as valid', async () => {
    dataFake = null
    const err = await EventuallyRejects(decodeResult(response, (_): _ is unknown => true))
    expect(err).to.be.an.instanceOf(Error)
    expect(err.message).to.equal('Invalid JSON object decoded')
  })
  it('should resolve to json data when data is valid', async () => {
    dataFake = { foo: 'bar', baz: Math.random() }
    const data = await decodeResult(response, isUnknown)
    expect(data).to.equal(dataFake)
  })
})
