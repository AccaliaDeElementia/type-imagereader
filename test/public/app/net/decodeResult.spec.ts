'use sanity'

import { expect, use as chaiUse } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { decodeResult } from '../../../../public/scripts/app/net'
import { Cast } from '../../../testutils/TypeGuards'
chaiUse(chaiAsPromised)

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
    await expect(decodeResult(response, isUnknown)).to.eventually.be.rejectedWith('Empty JSON response recieved')
  })
  it('should reject when data is an error', async () => {
    dataFake = { error: 'This is an Error! FOO!' }
    await expect(decodeResult(response, isUnknown)).to.eventually.be.rejectedWith('This is an Error! FOO!')
  })
  it('should reject when isT does not validate json result', async () => {
    await expect(decodeResult(response, (_): _ is unknown => false)).to.eventually.be.rejectedWith(
      'Invalid JSON object decoded',
    )
  })
  it('should reject for null result ecen if isT accepts nulla s valid', async () => {
    dataFake = null
    await expect(decodeResult(response, (_): _ is unknown => true)).to.eventually.be.rejectedWith(
      'Invalid JSON object decoded',
    )
  })
  it('should resolve to json data when data is valid', async () => {
    dataFake = { foo: 'bar', baz: Math.random() }
    const data = await decodeResult(response, isUnknown)
    expect(data).to.equal(dataFake)
  })
})
