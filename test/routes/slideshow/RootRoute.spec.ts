'use sanity'

import Sinon from 'sinon'
import type { Request } from 'express'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import { expect } from 'chai'
import { Functions, Imports } from '#routes/slideshow'
import { createResponseFake } from '#testutils/Express'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow function RootRoute', () => {
  let reqStub = {
    params: { path: undefined as string | undefined },
  }
  let { stub: resStub, fake: responseFake } = createResponseFake()
  let requestFake = Cast<Request>(reqStub)
  let knexFake = StubToKnex({})
  let roomData = { images: [''], uriSafeImage: '' }
  let getRoomStub = Sinon.stub().resolves()
  let isPathTraversalStub = Sinon.stub()
  let noImages = [] as string[]
  let fullImages = ['1', '2', '3', '4', '5', '6', '7', '8']
  let getRoomError = new Error('Error Fetching Room!')
  beforeEach(() => {
    reqStub = {
      params: { path: undefined },
    }
    ;({ stub: resStub, fake: responseFake } = createResponseFake())
    requestFake = Cast<Request>(reqStub)
    knexFake = StubToKnex({})
    noImages = []
    fullImages = ['1', '2', '3', '4', '5', '6', '7', '8']
    roomData = { images: noImages, uriSafeImage: '/foo/bar/baz.png' }
    getRoomStub = sandbox.stub(Functions, 'GetRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    getRoomError = new Error('Error Fetching Room!')
  })
  afterEach(() => {
    sandbox.restore()
  })
  const eTraverse = {
    title: 'ERROR',
    code: 'E_NO_TRAVERSE',
    message: 'Directory Traversal is not Allowed!',
  }
  const eNotFound = {
    title: 'ERROR',
    code: 'E_NOT_FOUND',
    message: 'Not Found',
  }
  const eGeneric = {
    title: 'ERROR',
    code: 'INTERNAL_SERVER_ERROR',
    message: getRoomError,
  }
  const getArgs = (stub: Sinon.SinonStub): unknown[] => stub.firstCall.args as unknown[]
  it('should return FORBIDDEN when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await Functions.RootRoute(knexFake, requestFake, responseFake)
    expect(getArgs(resStub.status)[0]).to.equal(403)
  })
  it('should render error template when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await Functions.RootRoute(knexFake, requestFake, responseFake)
    expect(getArgs(resStub.render)[0]).to.equal('error')
  })
  it('should render E_NO_TRAVERSE error data when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await Functions.RootRoute(knexFake, requestFake, responseFake)
    expect(getArgs(resStub.render)[1]).to.deep.equal(eTraverse)
  })
  it('should not get room when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await Functions.RootRoute(knexFake, requestFake, responseFake)
    expect(getRoomStub.callCount).to.equal(0)
  })
  const tests: Array<[string, string | undefined, string[] | null, (data: unknown) => void]> = [
    ['get room', undefined, fullImages, () => expect(getRoomStub.callCount).to.equal(1)],
    ['get room', 'foo', fullImages, () => expect(getRoomStub.callCount).to.equal(1)],
    ['set not found status', 'foo', noImages, () => expect(resStub.status.callCount).to.equal(1)],
    ['set not found status code', 'foo', noImages, () => expect(getArgs(resStub.status)[0]).to.equal(404)],
    ['render not found error', 'foo', noImages, () => expect(getArgs(resStub.render)[0]).to.deep.equal('error')],
    ['render not found data', 'foo', noImages, () => expect(getArgs(resStub.render)[1]).to.deep.equal(eNotFound)],
    ['not set success status', 'foo', fullImages, () => expect(resStub.status.callCount).to.equal(0)],
    ['render success', 'foo', fullImages, () => expect(resStub.render.callCount).to.equal(1)],
    ['render success tmpl', 'foo', fullImages, () => expect(getArgs(resStub.render)[0]).to.equal('slideshow')],
    ['render success data', 'foo', fullImages, (data) => expect(getArgs(resStub.render)[1]).to.deep.equal(data)],
    ['set server error status', 'foo', null, () => expect(resStub.status.callCount).to.equal(1)],
    ['set server error status code', 'foo', null, () => expect(getArgs(resStub.status)[0]).to.equal(500)],
    ['render server error', 'foo', null, () => expect(resStub.render.callCount).to.equal(1)],
    ['render server error template', 'foo', null, () => expect(getArgs(resStub.render)[0]).to.equal('error')],
    ['render server error data', 'foo', null, () => expect(getArgs(resStub.render)[1]).to.deep.equal(eGeneric)],
  ]
  tests.forEach(([title, path, images, validationFn]) => {
    it(`should ${title} for '/${path}'`, async () => {
      if (images === null) {
        getRoomStub.rejects(getRoomError)
      } else {
        roomData.images = images
        getRoomStub.resolves(roomData)
      }
      if (path !== undefined) {
        reqStub.params.path = path
      }
      const successData = {
        title: `/${path}`,
        folder: `/${path}`,
        image: roomData.uriSafeImage,
      }
      await Functions.RootRoute(knexFake, requestFake, responseFake)
      validationFn(successData)
    })
  })
})
