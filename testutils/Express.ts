import Sinon from 'sinon'
import type { Response } from 'express'

import { Cast } from './TypeGuards'

export interface ResponseStub {
  status: Sinon.SinonStub
  json: Sinon.SinonStub
  send: Sinon.SinonStub
  end: Sinon.SinonStub
}

export function createResponseFake(): { stub: ResponseStub; fake: Response } {
  const stub: ResponseStub = {
    status: Sinon.stub().returnsThis(),
    json: Sinon.stub().returnsThis(),
    send: Sinon.stub().returnsThis(),
    end: Sinon.stub().returnsThis(),
  }
  return { stub, fake: Cast<Response>(stub) }
}
