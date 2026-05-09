'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { PubSub } from '#public/scripts/app/pubsub.js'
import { Internals, Navigation } from '#public/scripts/app/navigation.js'
import { cast } from '#testutils/TypeGuards.js'
import { eventuallyFulfills } from '#testutils/Errors.js'

const sandbox = Sinon.createSandbox()
describe('public/app/navigation NavigateTo()', () => {
  const errorSpy = sandbox.stub()
  let loadDataSpy = sandbox.stub()
  beforeEach(() => {
    errorSpy.resolves()
    PubSub.subscribers = {
      'LOADING:ERROR': [errorSpy],
    }
    loadDataSpy = sandbox.stub(Internals, 'loadData').resolves()
  })
  afterEach(() => {
    sandbox.restore()
    errorSpy.reset()
  })
  const invalidPaths: Array<[string, string | undefined]> = [
    ['empty', ''],
    ['undefined', undefined],
    ['null', cast<string>(null)],
  ]
  invalidPaths.forEach(([title, path]) => {
    it(`should publish error when path is ${title}`, async () => {
      await Internals.NavigateTo(path, 'FOO')
      expect(errorSpy.called).to.equal(true)
    })
  })
  it('should publish error message when path is invalid', async () => {
    await Internals.NavigateTo('', 'FOO')
    expect(errorSpy.firstCall.args[0]).to.equal('Action FOO has no target')
  })
  it('should not alter current location when path is invalid', async () => {
    const data = { path: '/FOO', name: 'foo', parent: '/' }
    Navigation.current = data
    await Internals.NavigateTo('', 'FOO')
    expect(Navigation.current).to.equal(data)
  })
  it('should not load data when path is invalid', async () => {
    await Internals.NavigateTo('', 'FOO')
    expect(loadDataSpy.called).to.equal(false)
  })
  it('should alter current location when path is valid', async () => {
    Navigation.current = { path: '/FOO', name: 'foo', parent: '/' }
    await Internals.NavigateTo('/bar/121', 'FOO')
    expect(Navigation.current).to.deep.equal({ path: '/bar/121', name: '', parent: '' })
  })
  it('should load data when path is valid', async () => {
    await Internals.NavigateTo('/foo', 'FOO')
    expect(loadDataSpy.called).to.equal(true)
  })
  it('should load data in default mode when path is valid', async () => {
    await Internals.NavigateTo('/foo', 'FOO')
    expect(loadDataSpy.firstCall.args).to.have.lengthOf(0)
  })
  it('should swallow error when loadData rejects', async () => {
    loadDataSpy.rejects('FOO')
    await eventuallyFulfills(Internals.NavigateTo('/foo', 'FOO'))
  })
})
