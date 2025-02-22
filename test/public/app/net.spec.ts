'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { Net } from '../../../public/scripts/app/net'
import { EventuallyRejects } from '../../testutils/Errors'
import { Cast } from '../../testutils/TypeGuards'

interface TestResponse {
  method: string
  body: string
  headers: Record<string, string>
}

@suite
export class AppNetTests {
  static fetchStub: sinon.SinonStub
  static fetchData: sinon.SinonStub
  static fetchLengthStub: sinon.SinonStub

  static before(): void {
    this.fetchStub = sinon.stub(global, 'fetch')
    this.fetchLengthStub = sinon.stub()
    this.fetchData = sinon.stub()
  }

  before(): void {
    AppNetTests.fetchStub.resolves(
      Cast<Response>({
        headers: {
          get: AppNetTests.fetchLengthStub,
        },
        json: AppNetTests.fetchData,
      }),
    )
    AppNetTests.fetchLengthStub.returns('2')
    AppNetTests.fetchData.resolves({})
  }

  after(): void {
    AppNetTests.fetchLengthStub.reset()
    AppNetTests.fetchStub.reset()
    AppNetTests.fetchData.reset()
  }

  static after(): void {
    this.fetchStub.restore()
  }

  @test
  async 'GetJSON calls fetch with provided path'(): Promise<void> {
    const path = `/Some/Test/Path/${Math.random()}`
    await Net.GetJSON(path, (_): _ is unknown => true)
    expect(AppNetTests.fetchStub.calledWith(path)).to.equal(true)
  }

  @test
  async 'GetJSON calls fetch as GET request'(): Promise<void> {
    await Net.GetJSON('/some/path', (_): _ is unknown => true)
    expect(Cast<TestResponse>(AppNetTests.fetchStub.getCall(0).args[1]).method).to.equal('GET')
  }

  @test
  async 'GetJSON calls fetch With expected Headers'(): Promise<void> {
    await Net.GetJSON('/some/path', (_): _ is unknown => true)
    const headers = Cast<TestResponse>(AppNetTests.fetchStub.getCall(0).args[1]).headers
    expect(headers).to.not.equal(undefined)
    expect(headers['Accept-Encoding']).to.equal('gzip, deflate, br')
    expect(headers.Accept).to.equal('application/json')
    expect(headers['Content-Type']).to.equal('application/json')
  }

  @test
  async 'GetJSON rejects when error decoded'(): Promise<void> {
    AppNetTests.fetchData.resolves({ error: 'MUY MALO!' })
    const e = await EventuallyRejects(Net.GetJSON('/some/path', (_): _ is unknown => true))
    expect(e.message).to.equal('MUY MALO!')
  }

  @test
  async 'GetJSON rejects on no response'(): Promise<void> {
    AppNetTests.fetchLengthStub.returns('0')
    const e = await EventuallyRejects(Net.GetJSON('/some/path', (_): _ is unknown => true))
    expect(e.message).to.equal('Empty JSON response recieved')
  }

  @test
  async 'GetJSON rejects on null response'(): Promise<void> {
    AppNetTests.fetchData.resolves(null)
    const e = await EventuallyRejects(Net.GetJSON('/some/path', (_): _ is unknown => true))
    expect(e.message).to.equal('Invalid JSON object decoded')
  }

  @test
  async 'GetJSON rejects on itIs failure'(): Promise<void> {
    const e = await EventuallyRejects(Net.GetJSON('/some/path', (_): _ is unknown => false))
    expect(e.message).to.equal('Invalid JSON object decoded')
  }

  @test
  async 'GetJSON returns JSON result on non empty response'(): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = {
      alpha: '1',
      numeral: 1,
    }
    AppNetTests.fetchData.resolves(expected)
    const data = await Net.GetJSON('/some/path', (_): _ is unknown => true)
    expect(data).to.equal(expected)
    expect(AppNetTests.fetchData.called).to.equal(true)
  }

  @test
  async 'GetJSON rejects when JSON contains error'(): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = 'MUY MALO!'
    AppNetTests.fetchData.resolves({
      error: expected,
    })
    const e = await EventuallyRejects(Net.GetJSON('/some/path', (_): _ is unknown => true))
    expect(e.message).to.equal(expected)
  }

  @test
  async 'GetJSON rejects when fetch rejects'(): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchStub.rejects(new Error(expected))
    const e = await EventuallyRejects(Net.GetJSON('/some/path', (_): _ is unknown => true))
    expect(e.message).to.equal(expected)
  }

  @test
  async 'GetJSON rejects when json() rejects'(): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchLengthStub.returns('1')
    AppNetTests.fetchData.rejects(new Error(expected))
    const e = await EventuallyRejects(Net.GetJSON('/some/path', (_): _ is unknown => true))
    expect(e.message).to.equal(expected)
  }

  @test
  async 'PostJSON calls fetch with provided path'(): Promise<void> {
    const path = `/Some/Test/Path/${Math.random()}`
    await Net.PostJSON(path, {}, (_): _ is unknown => true)
    expect(AppNetTests.fetchStub.calledWith(path)).to.equal(true)
  }

  @test
  async 'PostJSON calls fetch as POST request'(): Promise<void> {
    await Net.PostJSON('/some/path', {}, (_): _ is unknown => true)
    expect(Cast<TestResponse>(AppNetTests.fetchStub.getCall(0).args[1]).method).to.equal('POST')
  }

  @test
  async 'PostJSON calls fetch with expected Headers'(): Promise<void> {
    await Net.PostJSON('/some/path', {}, (_): _ is unknown => true)
    const headers = Cast<TestResponse>(AppNetTests.fetchStub.getCall(0).args[1]).headers
    expect(headers).to.not.equal(undefined)
    expect(headers['Accept-Encoding']).to.equal('gzip, deflate, br')
    expect(headers.Accept).to.equal('application/json')
    expect(headers['Content-Type']).to.equal('application/json')
  }

  @test
  async 'PostJSON calls fetch with expected data'(): Promise<void> {
    const matrix = [
      1,
      '',
      {
        foo: 'bar',
      },
      [1, 2, 3, 4],
      {
        random: Math.random(),
      },
    ]
    for (let i = 0; i < matrix.length; i++) {
      await Net.PostJSON('/some/path', matrix[i], (_): _ is unknown => true)
      const body = Cast<TestResponse>(AppNetTests.fetchStub.getCall(i).args[1]).body
      expect(body).to.equal(JSON.stringify(matrix[i]))
    }
  }

  @test
  async 'PostJSON rejects when error decoded'(): Promise<void> {
    AppNetTests.fetchData.resolves({ error: 'MUY MALO!' })
    const e = await EventuallyRejects(Net.PostJSON('/some/path', {}, (_): _ is unknown => false))
    expect(e.message).to.equal('MUY MALO!')
  }

  @test
  async 'PostJSON rejects when itIs fails'(): Promise<void> {
    const e = await EventuallyRejects(Net.PostJSON('/some/path', {}, (_): _ is unknown => false))
    expect(e.message).to.equal('Invalid JSON object decoded')
  }

  @test
  async 'PostJSON rejects on null response'(): Promise<void> {
    AppNetTests.fetchData.resolves(null)
    const e = await EventuallyRejects(Net.PostJSON('/some/path', {}, (_): _ is unknown => true))
    expect(e.message).to.equal('Invalid JSON object decoded')
  }

  @test
  async 'PostJSON rejects on no response'(): Promise<void> {
    AppNetTests.fetchLengthStub.returns('0')
    const e = await EventuallyRejects(Net.PostJSON('/some/path', {}, (_): _ is unknown => true))
    expect(e.message).to.equal('Empty JSON response recieved')
  }

  @test
  async 'PostJSON returns JSON result on non empty response'(): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = {
      alpha: '1',
      numeral: 1,
    }
    AppNetTests.fetchData.resolves(expected)
    const data = await Net.PostJSON('/some/path', {}, (_): _ is unknown => true)
    expect(data).to.equal(expected)
    expect(AppNetTests.fetchData.called).to.equal(true)
  }

  @test
  async 'PostJSON rejects when JSON contains error'(): Promise<void> {
    AppNetTests.fetchLengthStub.returns('45')
    const expected = 'MUY MALO!'
    AppNetTests.fetchData.resolves({
      error: expected,
    })
    const e = await EventuallyRejects(Net.PostJSON('/some/path', {}, (_): _ is unknown => true))
    expect(e.message).to.equal(expected)
  }

  @test
  async 'PostJSON rejects when fetch rejects'(): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchStub.rejects(new Error(expected))
    const e = await EventuallyRejects(Net.PostJSON('/some/path', {}, (_): _ is unknown => true))
    expect(e.message).to.equal(expected)
  }

  @test
  async 'PostJSON rejects when json() rejects'(): Promise<void> {
    const expected = 'MUY MALO!'
    AppNetTests.fetchLengthStub.returns('1')
    AppNetTests.fetchData.rejects(new Error(expected))
    const e = await EventuallyRejects(Net.PostJSON('/some/path', {}, (_): _ is unknown => true))
    expect(e.message).to.equal(expected)
  }
}
