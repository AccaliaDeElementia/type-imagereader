'use sanity'

import { expect } from 'chai'
import { Internals } from '#public/scripts/slideshow/weather.js'
import Sinon from 'sinon'
import { URL } from 'node:url'
import { JSDOM } from 'jsdom'
import { eventuallyRejects } from '#testutils/errors.js'
import { cast } from '#testutils/typeGuards.js'
import { mountDom, unmountDom } from '#testutils/dom.js'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/weather fetchWeather()', () => {
  let fetchStub = sandbox.stub()

  const dom = new JSDOM('<html></html>')
  beforeEach(() => {
    mountDom(dom)
    fetchStub = sandbox.stub()
    fetchStub.resolves({ json: async () => await Promise.resolve({}) })
    dom.window.fetch = fetchStub
  })

  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })

  it('should return expected data on success', async () => {
    const data = { extraData: Math.random() }
    fetchStub.resolves({ json: sandbox.stub().resolves(data) })
    expect(await Internals.fetchWeather('foo!')).to.equal(data)
  })

  it('should call fetch once for provided uri', async () => {
    const target = new URL('https://localhost:8192/foo')
    await Internals.fetchWeather(target)
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should call fetch with two arguments for provided uri', async () => {
    const target = new URL('https://localhost:8192/foo')
    await Internals.fetchWeather(target)
    expect(fetchStub.firstCall.args).to.have.length(2)
  })
  it('should call fetch with the provided uri', async () => {
    const target = new URL('https://localhost:8192/foo')
    await Internals.fetchWeather(target)
    expect(fetchStub.firstCall.args[0]).to.equal(target)
  })

  it('should call fetch once for provided string', async () => {
    const target = 'https://localhost:8192/foo'
    await Internals.fetchWeather(target)
    expect(fetchStub.callCount).to.equal(1)
  })
  it('should call fetch with two arguments for provided string', async () => {
    const target = 'https://localhost:8192/foo'
    await Internals.fetchWeather(target)
    expect(fetchStub.firstCall.args).to.have.length(2)
  })
  it('should call fetch with the provided string', async () => {
    const target = 'https://localhost:8192/foo'
    await Internals.fetchWeather(target)
    expect(fetchStub.firstCall.args[0]).to.equal(target)
  })
  it('should pass an AbortSignal in the fetch options', async () => {
    const sentinelSignal = cast<AbortSignal>({})
    sandbox.stub(AbortSignal, 'timeout').returns(sentinelSignal)
    await Internals.fetchWeather('https://localhost/x')
    expect(cast<{ signal: unknown }>(fetchStub.firstCall.args[1]).signal).to.equal(sentinelSignal)
  })
  it('should set the AbortSignal timeout to 60 seconds', async () => {
    const timeoutStub = sandbox.stub(AbortSignal, 'timeout').returns(cast<AbortSignal>({}))
    await Internals.fetchWeather('https://localhost/x')
    expect(timeoutStub.firstCall.args).to.deep.equal([60_000])
  })

  it('should reject when fetch rejects', async () => {
    const err = new Error('I AM ERROR')
    fetchStub.rejects(err)
    const result = await eventuallyRejects(Internals.fetchWeather('FOO'))
    expect(result).to.equal(err)
  })

  it('should reject when json rejects', async () => {
    const err = new Error('I AM ERROR')
    fetchStub.resolves({ json: sandbox.stub().rejects(err) })
    const result = await eventuallyRejects(Internals.fetchWeather('FOO'))
    expect(result).to.equal(err)
  })

  it('should reject when fetch resolves invalid WeatherResultsjects', async () => {
    fetchStub.resolves({ json: sandbox.stub().resolves(42) })
    const result = await eventuallyRejects(Internals.fetchWeather('FOO'))
    expect(result.message).to.equal('Invalid WeatherResponse Retrieved')
  })
})
