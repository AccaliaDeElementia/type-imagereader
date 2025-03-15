'use sanity'

import Sinon from 'sinon'
import { Functions, WebSockets } from '../../../../public/scripts/slideshow/sockets'
import { beforeEach, afterEach, describe, it } from 'mocha'
import { expect } from 'chai'

describe('public/slideshow/sockets HandleGetLaunchId()', () => {
  let fakeReload: Sinon.SinonStub | undefined = undefined
  beforeEach(() => {
    fakeReload = Sinon.stub(WebSockets, 'LocationReload')
    WebSockets.launchId = undefined
  })
  afterEach(() => {
    fakeReload?.restore()
  })
  it('should save launchId on call', () => {
    Functions.HandleGetLaunchId(8675309)
    expect(WebSockets.launchId).to.equal(8675309)
  })
  it('should not reload on first call', () => {
    Functions.HandleGetLaunchId(8675309)
    expect(fakeReload?.callCount).to.equal(0)
  })
  it('should preserve launchId on recall', () => {
    WebSockets.launchId = 8675309
    Functions.HandleGetLaunchId(8675309)
    expect(WebSockets.launchId).to.equal(8675309)
  })
  it('should not reload on recall', () => {
    WebSockets.launchId = 8675309
    Functions.HandleGetLaunchId(8675309)
    expect(fakeReload?.callCount).to.equal(0)
  })
  it('should preserve launchId on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Functions.HandleGetLaunchId(8675309)
    expect(WebSockets.launchId).to.equal('Old Id')
  })
  it('should reload on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Functions.HandleGetLaunchId(8675309)
    expect(fakeReload?.callCount).to.equal(1)
  })
})
