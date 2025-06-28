'use sanity'

import { expect, use as chaiUse } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Net } from '../../../../public/scripts/app/net'
import { Cast } from '../../../testutils/TypeGuards'
import Sinon from 'sinon'
chaiUse(chaiAsPromised)

interface TestRequest {
  method: string
  body: string
  headers: Record<string, string>
}

describe('public/app/net function GetJSON()', () => {
  let response = Cast<Response>(null)
  let contentLengthFake = '2'
  let dataFake: Record<string, number> = {}
  const isUnknown = (_: unknown): _ is unknown => true
  let fetchStub = Sinon.stub()
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
    fetchStub = Sinon.stub(global, 'fetch').resolves(response)
  })
  afterEach(() => {
    fetchStub.restore()
  })
  it('should call fetch with provided path', async () => {
    const path = `/Some/Test/Path/${Math.random()}`
    await Net.GetJSON(path, isUnknown)
    expect(fetchStub.calledWith(path)).to.equal(true)
  })
  it('should use GET method', async () => {
    await Net.GetJSON('/foo', isUnknown)
    const req = Cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.method).to.equal('GET')
  })
  it('should set only expected headers', async () => {
    await Net.GetJSON('', isUnknown)
    const req = Cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.headers).to.have.all.keys(['Content-Type', 'Accept-Encoding', 'Accept'])
  })
  it('should set Accept-Encoding header', async () => {
    await Net.GetJSON('/foo', isUnknown)
    const req = Cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.headers['Accept-Encoding']).to.equal('gzip, deflate, br')
  })
  it('should set Accept header', async () => {
    await Net.GetJSON('/foo', isUnknown)
    const req = Cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.headers.Accept).to.equal('application/json')
  })
  it('should set Content-Type header', async () => {
    await Net.GetJSON('/foo', isUnknown)
    const req = Cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.headers['Content-Type']).to.equal('application/json')
  })
  it('should not set body in request', async () => {
    await Net.GetJSON('', isUnknown)
    const req = Cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.body).to.equal(undefined)
  })
  it('should resolve to expected object', async () => {
    dataFake.foo = Math.random()
    const result = await Net.GetJSON('', isUnknown)
    expect(result).to.equal(dataFake)
  })
})
