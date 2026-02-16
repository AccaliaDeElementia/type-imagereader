'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { Config, SocketHandlers } from '../../../routes/slideshow'

describe('routes/slideshow socket get-launchId()', () => {
  it('should call provided callback on invocation', () => {
    const spy = Sinon.stub()
    SocketHandlers.getLaunchId(spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should retrieve Config.launchId on invocation', () => {
    const value = 1e9 + Math.floor(Math.random() * 1e9)
    Config.launchId = value
    const spy = Sinon.stub()
    SocketHandlers.getLaunchId(spy)
    expect(spy.firstCall.args).to.deep.equal([value])
  })
})
