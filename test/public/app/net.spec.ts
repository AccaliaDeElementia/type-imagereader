'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { Net } from '../../../public/scripts/app/net'

@suite
export class AppNetTests {
  static fetchStub: sinon.SinonStub
  static fetchData: sinon.SinonStub
  static fetchLengthStub: sinon.SinonStub

  static before (): void {
    this.fetchStub = sinon.stub(global, 'fetch')
    this.fetchLengthStub = sinon.stub()
    this.fetchData = sinon.stub()
  }

  before (): void {
    AppNetTests.fetchStub.resolves(({
      headers: {
        get: AppNetTests.fetchLengthStub
      },
      json: AppNetTests.fetchData
    } as unknown) as Response)
    AppNetTests.fetchLengthStub.returns('0')
    AppNetTests.fetchData.resolves({})
  }

  after (): void {
    AppNetTests.fetchLengthStub.reset()
    AppNetTests.fetchStub.reset()
    AppNetTests.fetchData.reset()
  }

  static after (): void {
    this.fetchStub.restore()
  }

  @test
  async 'GetJSON calls fetch with provided path' (): Promise<void> {
    const path = `/Some/Test/Path/${Math.random()}`
    await Net.GetJSON(path)
    expect(AppNetTests.fetchStub.calledWith(path)).to.equal(true)
  }

  @test
  async 'GetJSON calls fetch as GET request' (): Promise<void> {
    await Net.GetJSON('/some/path')
    expect(AppNetTests.fetchStub.getCall(0).args[1].method).to.equal('GET')
  }

  @test
  async 'GetJSON calls fetch With expected Headers' (): Promise<void> {
    await Net.GetJSON('/some/path')
    const headers = AppNetTests.fetchStub.getCall(0).args[1].headers
    expect(headers).to.not.equal(undefined)
    expect(headers['Accept-Encoding']).to.equal('gzip, deflate, br')
    expect(headers.Accept).to.equal('application/json')
    expect(headers['Content-Type']).to.equal('application/json')
  }

  @test
  async 'GetJSON returns empty object on no response' (): Promise<void> {
    AppNetTests.fetchLengthStub.returns('0')
    const data = await Net.GetJSON('/some/path')
    expect(data).to.deep.equal({})
    expect(AppNetTests.fetchData.called).to.equal(false)
  }

  @test
  async 'GetJSON returns JSON result on non empty response' (): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = {
      alpha: '1',
      numeral: 1
    }
    AppNetTests.fetchData.resolves(expected)
    const data = await Net.GetJSON('/some/path')
    expect(data).to.equal(expected)
    expect(AppNetTests.fetchData.called).to.equal(true)
  }

  @test
  async 'GetJSON rejects when JSON contains error' (): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = 'MUY MALO!'
    AppNetTests.fetchData.resolves({
      error: expected
    })
    await expect(Net.GetJSON('/some/path')).to.eventually.be.rejectedWith(expected)
  }

  @test
  async 'GetJSON rejects when fetch rejects' (): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchStub.rejects(new Error(expected))
    await expect(Net.GetJSON('/some/path')).to.eventually.be.rejectedWith(expected)
  }

  @test
  async 'GetJSON rejects when json() rejects' (): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchLengthStub.returns('1')
    AppNetTests.fetchData.rejects(new Error(expected))
    await expect(Net.GetJSON('/some/path')).to.eventually.be.rejectedWith(expected)
  }

  @test
  async 'PostJSON calls fetch with provided path' (): Promise<void> {
    const path = `/Some/Test/Path/${Math.random()}`
    await Net.PostJSON(path, {})
    expect(AppNetTests.fetchStub.calledWith(path)).to.equal(true)
  }

  @test
  async 'PostJSON calls fetch as POST request' (): Promise<void> {
    await Net.PostJSON('/some/path', {})
    expect(AppNetTests.fetchStub.getCall(0).args[1].method).to.equal('POST')
  }

  @test
  async 'PostJSON calls fetch with expected Headers' (): Promise<void> {
    await Net.PostJSON('/some/path', {})
    const headers = AppNetTests.fetchStub.getCall(0).args[1].headers
    expect(headers).to.not.equal(undefined)
    expect(headers['Accept-Encoding']).to.equal('gzip, deflate, br')
    expect(headers.Accept).to.equal('application/json')
    expect(headers['Content-Type']).to.equal('application/json')
  }

  @test
  async 'PostJSON calls fetch with expected data' (): Promise<void> {
    const matrix = [
      1,
      '',
      {
        foo: 'bar'
      },
      [1, 2, 3, 4],
      {
        random: Math.random()
      }
    ]
    for (let i = 0; i < matrix.length; i++) {
      await Net.PostJSON('/some/path', matrix[i])
      const body = AppNetTests.fetchStub.getCall(i).args[1].body
      expect(body).to.equal(JSON.stringify(matrix[i]))
    }
  }

  @test
  async 'PostJSON returns empty object on no response' (): Promise<void> {
    AppNetTests.fetchLengthStub.returns('0')
    const data = await Net.PostJSON('/some/path', {})
    expect(data).to.deep.equal({})
    expect(AppNetTests.fetchData.called).to.equal(false)
  }

  @test
  async 'PostJSON returns JSON result on non empty response' (): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = {
      alpha: '1',
      numeral: 1
    }
    AppNetTests.fetchData.resolves(expected)
    const data = await Net.PostJSON('/some/path', {})
    expect(data).to.equal(expected)
    expect(AppNetTests.fetchData.called).to.equal(true)
  }

  @test
  async 'PostJSON rejects when JSON contains error' (): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = 'MUY MALO!'
    AppNetTests.fetchData.resolves({
      error: expected
    })
    await expect(Net.PostJSON('/some/path', {})).to.eventually.be.rejectedWith(expected)
  }

  @test
  async 'PostJSON rejects when fetch rejects' (): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchStub.rejects(new Error(expected))
    await expect(Net.PostJSON('/some/path', {})).to.eventually.be.rejectedWith(expected)
  }

  @test
  async 'PostJSON rejects when json() rejects' (): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchLengthStub.returns('1')
    AppNetTests.fetchData.rejects(new Error(expected))
    await expect(Net.PostJSON('/some/path', {})).to.eventually.be.rejectedWith(expected)
  }
}
