'use sanity'

import Sinon from 'sinon'
import { Imports, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { cast } from '#testutils/typeGuards.js'
import { eventuallyFulfills } from '#testutils/errors.js'

const sandbox = Sinon.createSandbox()
describe('public/app/navigation navigateTo()', () => {
  let publishStub = sandbox.stub()
  let loadDataSpy = sandbox.stub()
  beforeEach(() => {
    publishStub = sandbox.stub(Imports, 'publish')
    loadDataSpy = sandbox.stub(Internals, 'loadData').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  const invalidPaths: Array<[string, string | undefined]> = [
    ['empty', ''],
    ['undefined', undefined],
    ['null', cast<string>(null)],
  ]
  invalidPaths.forEach(([title, path]) => {
    it(`should publish error when path is ${title}`, async () => {
      await Internals.navigateTo(path, 'FOO')
      expect(publishStub.calledWith('Loading:Error')).toBe(true)
    })
  })
  it('should publish error message when path is invalid', async () => {
    await Internals.navigateTo('', 'FOO')
    expect(publishStub.withArgs('Loading:Error').firstCall.args[1]).toBe('Action FOO has no target')
  })
  it('should not alter current location when path is invalid', async () => {
    const data = { path: '/FOO', name: 'foo', parent: '/' }
    Navigation.current = data
    await Internals.navigateTo('', 'FOO')
    expect(Navigation.current).toBe(data)
  })
  it('should not load data when path is invalid', async () => {
    await Internals.navigateTo('', 'FOO')
    expect(loadDataSpy.called).toBe(false)
  })
  it('should alter current location when path is valid', async () => {
    Navigation.current = { path: '/FOO', name: 'foo', parent: '/' }
    await Internals.navigateTo('/bar/121', 'FOO')
    expect(Navigation.current).toEqual({ path: '/bar/121', name: '', parent: '' })
  })
  it('should load data when path is valid', async () => {
    await Internals.navigateTo('/foo', 'FOO')
    expect(loadDataSpy.called).toBe(true)
  })
  it('should load data in default mode when path is valid', async () => {
    await Internals.navigateTo('/foo', 'FOO')
    expect(loadDataSpy.firstCall.args).toHaveLength(0)
  })
  it('should swallow error when loadData rejects', async () => {
    loadDataSpy.rejects('FOO')
    await eventuallyFulfills(Internals.navigateTo('/foo', 'FOO'))
  })
})
