'use sanity'

import type { Response } from 'express'
import { vi, type Mock } from 'vitest'

import { cast } from './typeGuards.js'

export interface ResponseStub {
  status: Mock
  json: Mock
  send: Mock
  end: Mock
  render: Mock
  set: Mock
}

// Express response methods are chainable (res.status(...).json(...)), so each fake
// returns `this`. `render` returns a Promise<this> to match Express's signature.
const returnThis = function (this: object): unknown {
  return this
}
const resolveThis = async function (this: object): Promise<unknown> {
  return await Promise.resolve(this)
}

export function createResponseFake(): { stub: ResponseStub; fake: Response } {
  const stub: ResponseStub = {
    status: vi.fn().mockImplementation(returnThis),
    json: vi.fn().mockImplementation(returnThis),
    send: vi.fn().mockImplementation(returnThis),
    end: vi.fn().mockImplementation(returnThis),
    render: vi.fn().mockImplementation(resolveThis),
    set: vi.fn().mockImplementation(returnThis),
  }
  return { stub, fake: cast<Response>(stub) }
}
