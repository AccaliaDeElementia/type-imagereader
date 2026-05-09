'use sanity'

import { expect } from 'chai'
import type { Request, Response } from 'express'
import Sinon from 'sinon'
import { cast } from '#testutils/TypeGuards.js'
import { SetClacksOverhead } from '#Server.js'

const sandbox = Sinon.createSandbox()

describe('Server SetClacksOverhead', () => {
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
    SetClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.callCount).to.equal(1)
  })
  it('should set the X-Clacks-Overhead header name', () => {
    SetClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.firstCall.args[0]).to.equal('X-Clacks-Overhead')
  })
  it('should set the GNU Terry Pratchett header value', () => {
    SetClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.firstCall.args[1]).to.equal('GNU Terry Pratchett')
  })
  it('should call next once', () => {
    SetClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(nextStub.callCount).to.equal(1)
  })
  it('should call next after setting the header', () => {
    SetClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(nextStub.calledAfter(resStub.set)).to.equal(true)
  })
})
