'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Navigation } from '../../../../public/scripts/app/navigation'
import { Cast } from '../../../testutils/TypeGuards'
describe('public/app/navigation function NavigateTo()', () => {
  const errorSpy = Sinon.stub()
  let loadDataSpy = Sinon.stub()
  beforeEach(() => {
    errorSpy.resolves()
    PubSub.subscribers = {
      'LOADING:ERROR': [errorSpy],
    }
    loadDataSpy = Sinon.stub(Navigation, 'LoadData').resolves()
  })
  afterEach(() => {
    loadDataSpy.restore()
    errorSpy.reset()
  })
  it('should publish error when path is empty', async () => {
    await Navigation.NavigateTo('', 'FOO')
    expect(errorSpy.called).to.equal(true)
  })
  it('should publish error when path is undefined', async () => {
    await Navigation.NavigateTo(undefined, 'FOO')
    expect(errorSpy.called).to.equal(true)
  })
  it('should publish error when path is null', async () => {
    await Navigation.NavigateTo(Cast<string>(null), 'FOO')
    expect(errorSpy.called).to.equal(true)
  })
  it('should publish error message when path is invalid', async () => {
    await Navigation.NavigateTo('', 'FOO')
    expect(errorSpy.firstCall.args[0]).to.equal('Action FOO has no target')
  })
  it('should not alter current location when path is invalid', async () => {
    const data = { path: '/FOO', name: 'foo', parent: '/' }
    Navigation.current = data
    await Navigation.NavigateTo('', 'FOO')
    expect(Navigation.current).to.equal(data)
  })
  it('should not load data when path is invalid', async () => {
    await Navigation.NavigateTo('', 'FOO')
    expect(loadDataSpy.called).to.equal(false)
  })
  it('should alter current location when path is valid', async () => {
    Navigation.current = { path: '/FOO', name: 'foo', parent: '/' }
    await Navigation.NavigateTo('/bar/121', 'FOO')
    expect(Navigation.current).to.deep.equal({ path: '/bar/121', name: '', parent: '' })
  })
  it('should load data when path is valid', async () => {
    await Navigation.NavigateTo('/foo', 'FOO')
    expect(loadDataSpy.called).to.equal(true)
  })
  it('should load data in default mode when path is valid', async () => {
    await Navigation.NavigateTo('/foo', 'FOO')
    expect(loadDataSpy.firstCall.args).to.have.lengthOf(0)
  })
  it('should swallow error when LoadData rejects', async () => {
    loadDataSpy.rejects('FOO')
    await expect(Navigation.NavigateTo('/foo', 'FOO')).to.eventually.be.fulfilled
  })
})
