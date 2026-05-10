'use sanity'

import type { Request, Response } from 'express'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { setClacksOverhead } from '#server.js'

const sandbox = Sinon.createSandbox()

describe('Server setClacksOverhead', () => {
  let resStub = { set: sandbox.stub() }
  let resFake = cast<Response>(resStub)
  let nextStub = sandbox.stub()
  beforeEach(() => {
    resStub = { set: sandbox.stub() }
    resFake = cast<Response>(resStub)
    nextStub = sandbox.stub()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call res.set once', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.callCount).toBe(1)
  })
  it('should set the X-Clacks-Overhead header name', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.firstCall.args[0]).toBe('X-Clacks-Overhead')
  })
  it('should set the GNU Terry Pratchett header value', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.firstCall.args[1]).toBe('GNU Terry Pratchett')
  })
  it('should call next once', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(nextStub.callCount).toBe(1)
  })
  it('should call next after setting the header', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(nextStub.calledAfter(resStub.set)).toBe(true)
  })
})
