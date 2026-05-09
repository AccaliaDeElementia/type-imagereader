'use sanity'

import { expect } from 'chai'
import { getJSON } from '#public/scripts/app/net.js'
import { cast } from '#testutils/typeGuards.js'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

interface TestRequest {
  method: string
  body: string
  headers: Record<string, string>
}

describe('public/app/net getJSON()', () => {
  let response = cast<Response>(null)
  let contentLengthFake = '2'
  let dataFake: Record<string, number> = {}
  const isUnknown = (_: unknown): _ is unknown => true
  let fetchStub = sandbox.stub()
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
    fetchStub = sandbox.stub(global, 'fetch').resolves(response)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call fetch with provided path', async () => {
    const path = `/Some/Test/Path/${Math.random()}`
    await getJSON(path, isUnknown)
    expect(fetchStub.calledWith(path)).to.equal(true)
  })
  it('should use GET method', async () => {
    await getJSON('/foo', isUnknown)
    const req = cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.method).to.equal('GET')
  })
  it('should set only expected headers', async () => {
    await getJSON('', isUnknown)
    const req = cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.headers).to.have.all.keys(['Content-Type', 'Accept-Encoding', 'Accept'])
  })
  const headerTests: Array<[string, string, string]> = [
    ['Accept-Encoding', 'Accept-Encoding', 'gzip, deflate, br'],
    ['Accept', 'Accept', 'application/json'],
    ['Content-Type', 'Content-Type', 'application/json'],
  ]
  headerTests.forEach(([title, header, expected]) => {
    it(`should set ${title} header`, async () => {
      await getJSON('/foo', isUnknown)
      const req = cast<TestRequest>(fetchStub.firstCall.args[1])
      expect(req.headers[header]).to.equal(expected)
    })
  })
  it('should not set body in request', async () => {
    await getJSON('', isUnknown)
    const req = cast<TestRequest>(fetchStub.firstCall.args[1])
    expect(req.body).to.equal(undefined)
  })
  it('should resolve to expected object', async () => {
    dataFake.foo = Math.random()
    const result = await getJSON('', isUnknown)
    expect(result).to.equal(dataFake)
  })
})
