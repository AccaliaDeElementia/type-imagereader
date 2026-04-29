'use sanity'

import { expect } from 'chai'
import type { Request, Response } from 'express'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'
import { Functions } from '#Server'

const sandbox = Sinon.createSandbox()

describe('Server function SetClacksOverhead', () => {
  let resStub = { set: sandbox.stub() }
  let resFake = Cast<Response>(resStub)
  let nextStub = sandbox.stub()
  beforeEach(() => {
    resStub = { set: sandbox.stub() }
    resFake = Cast<Response>(resStub)
    nextStub = sandbox.stub()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call res.set once', () => {
    Functions.SetClacksOverhead(Cast<Request>({}), resFake, nextStub)
    expect(resStub.set.callCount).to.equal(1)
  })
  it('should set the X-Clacks-Overhead header name', () => {
    Functions.SetClacksOverhead(Cast<Request>({}), resFake, nextStub)
    expect(resStub.set.firstCall.args[0]).to.equal('X-Clacks-Overhead')
  })
  it('should set the GNU Terry Pratchett header value', () => {
    Functions.SetClacksOverhead(Cast<Request>({}), resFake, nextStub)
    expect(resStub.set.firstCall.args[1]).to.equal('GNU Terry Pratchett')
  })
  it('should call next once', () => {
    Functions.SetClacksOverhead(Cast<Request>({}), resFake, nextStub)
    expect(nextStub.callCount).to.equal(1)
  })
  it('should call next after setting the header', () => {
    Functions.SetClacksOverhead(Cast<Request>({}), resFake, nextStub)
    expect(nextStub.calledAfter(resStub.set)).to.equal(true)
  })
})
