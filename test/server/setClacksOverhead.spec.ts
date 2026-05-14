'use sanity'

import type { Request, Response } from 'express'
import { cast } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import { setClacksOverhead } from '#server.js'

describe('Server setClacksOverhead', () => {
  let resStub = { set: vi.fn() }
  let resFake = cast<Response>(resStub)
  let nextStub = voidFn()
  beforeEach(() => {
    resStub = { set: vi.fn() }
    resFake = cast<Response>(resStub)
    nextStub = voidFn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call res.set once', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.mock.calls.length).toBe(1)
  })
  it('should set the X-Clacks-Overhead header name', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.mock.calls[0]?.[0]).toBe('X-Clacks-Overhead')
  })
  it('should set the GNU Terry Pratchett header value', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(resStub.set.mock.calls[0]?.[1]).toBe('GNU Terry Pratchett')
  })
  it('should call next once', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect(nextStub.mock.calls.length).toBe(1)
  })
  it('should call next after setting the header', () => {
    setClacksOverhead(cast<Request>({}), resFake, nextStub)
    expect((nextStub.mock.invocationCallOrder[0] ?? 0) > (resStub.set.mock.invocationCallOrder[0] ?? 0)).toBe(true)
  })
})
