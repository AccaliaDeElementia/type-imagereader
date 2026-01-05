'use sanity'

import Sinon from 'sinon'
import type { Request, Response } from 'express'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { expect } from 'chai'
import { Functions } from '../../../routes/slideshow'

describe('routes/slideshow function RootRoute', () => {
  let reqStub = {
    params: ['path'],
  }
  let resStub = {
    status: Sinon.stub().returnsThis(),
    render: Sinon.stub().resolvesThis(),
  }
  let requestFake = Cast<Request>(reqStub)
  let responseFake = Cast<Response>(resStub)
  let knexFake = StubToKnex({})
  let roomData = { images: [''], uriSafeImage: '' }
  let getRoomStub = Sinon.stub().resolves()
  let noImages = [] as string[]
  let fullImages = ['1', '2', '3', '4', '5', '6', '7', '8']
  let getRoomError = new Error('Error Fetching Room!')
  beforeEach(() => {
    reqStub = {
      params: ['path'],
    }
    resStub = {
      status: Sinon.stub().returnsThis(),
      render: Sinon.stub().resolvesThis(),
    }
    requestFake = Cast<Request>(reqStub)
    responseFake = Cast<Response>(resStub)
    knexFake = StubToKnex({})
    noImages = []
    fullImages = ['1', '2', '3', '4', '5', '6', '7', '8']
    roomData = { images: noImages, uriSafeImage: '/foo/bar/baz.png' }
    getRoomStub = Sinon.stub(Functions, 'GetRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
    getRoomError = new Error('Error Fetching Room!')
  })
  afterEach(() => {
    getRoomStub.restore()
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
  const tests: Array<[string, string | undefined, string[] | null, (data: unknown) => void]> = [
    ['set status', 'foo/../bar', fullImages, () => expect(resStub.status.callCount).to.equal(1)],
    ['set status', 'foo/./bar', fullImages, () => expect(resStub.status.callCount).to.equal(1)],
    ['set status', 'foo//bar', fullImages, () => expect(resStub.status.callCount).to.equal(1)],
    ['set status', '~foo/bar', fullImages, () => expect(resStub.status.callCount).to.equal(1)],
    ['set status', '/foo/bar/', fullImages, () => expect(resStub.status.callCount).to.equal(1)],
    ['forbid', 'foo/../bar', fullImages, () => expect(getArgs(resStub.status)[0]).to.equal(403)],
    ['forbid', 'foo/./bar', fullImages, () => expect(getArgs(resStub.status)[0]).to.equal(403)],
    ['forbid', 'foo//bar', fullImages, () => expect(getArgs(resStub.status)[0]).to.equal(403)],
    ['forbid', '~foo/bar', fullImages, () => expect(getArgs(resStub.status)[0]).to.equal(403)],
    ['forbid', '/foo/bar/', fullImages, () => expect(getArgs(resStub.status)[0]).to.equal(403)],
    ['render', 'foo/../a', fullImages, () => expect(resStub.render.callCount).to.equal(1)],
    ['render', 'foo/./bar', fullImages, () => expect(resStub.render.callCount).to.equal(1)],
    ['render', 'foo//bar', fullImages, () => expect(resStub.render.callCount).to.equal(1)],
    ['render', '~foo/bar', fullImages, () => expect(resStub.render.callCount).to.equal(1)],
    ['render', '/foo/bar/', fullImages, () => expect(resStub.render.callCount).to.equal(1)],
    ['render error', 'foo/../a', fullImages, () => expect(getArgs(resStub.render)[0]).to.equal('error')],
    ['render error', 'foo/./bar', fullImages, () => expect(getArgs(resStub.render)[0]).to.equal('error')],
    ['render error', 'foo//bar', fullImages, () => expect(getArgs(resStub.render)[0]).to.equal('error')],
    ['render error', '~foo/bar', fullImages, () => expect(getArgs(resStub.render)[0]).to.equal('error')],
    ['render error', '/foo/bar/', fullImages, () => expect(getArgs(resStub.render)[0]).to.equal('error')],
    ['render err data', 'foo/../a', fullImages, () => expect(getArgs(resStub.render)[1]).to.deep.equal(eTraverse)],
    ['render err data', 'foo/./bar', fullImages, () => expect(getArgs(resStub.render)[1]).to.deep.equal(eTraverse)],
    ['render err data', 'foo//bar', fullImages, () => expect(getArgs(resStub.render)[1]).to.deep.equal(eTraverse)],
    ['render err data', '~foo/bar', fullImages, () => expect(getArgs(resStub.render)[1]).to.deep.equal(eTraverse)],
    ['render err data', '/foo/bar/', fullImages, () => expect(getArgs(resStub.render)[1]).to.deep.equal(eTraverse)],
    ['not get room', 'foo/../a', fullImages, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not get room', 'foo/./bar', fullImages, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not get room', 'foo//bar', fullImages, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not get room', '~foo/bar', fullImages, () => expect(getRoomStub.callCount).to.equal(0)],
    ['not get room', '/foo/bar/', fullImages, () => expect(getRoomStub.callCount).to.equal(0)],
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
      if (images == null) {
        getRoomStub.rejects(getRoomError)
      } else {
        roomData.images = images
        getRoomStub.resolves(roomData)
      }
      if (path === undefined) {
        reqStub.params = []
      } else {
        reqStub.params = [path]
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
