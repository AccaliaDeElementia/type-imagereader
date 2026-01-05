'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'
import { Config, Functions } from '../../../routes/slideshow'
import { expect } from 'chai'

describe('routes/slideshow function GetCounts()', () => {
  let knexFake = StubToKnex({})
  let getUnreadImageCountStub = Sinon.stub().resolves()
  let getImageCountStub = Sinon.stub().resolves()
  let randomStub = Sinon.stub()
  beforeEach(() => {
    Config.memorySize = 10
    knexFake = StubToKnex({})
    getUnreadImageCountStub = Sinon.stub(Functions, 'GetUnreadImageCount').resolves(0)
    getImageCountStub = Sinon.stub(Functions, 'GetImageCount').resolves(0)
    randomStub = Sinon.stub(Math, 'random').returns(0.5)
  })
  afterEach(() => {
    randomStub.restore()
    getImageCountStub.restore()
    getUnreadImageCountStub.restore()
  })
  it('should get unread image count', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getUnreadImageCountStub.callCount).to.equal(1)
  })
  it('should get unread image count with expected parameter count', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getUnreadImageCountStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should get unread image count with knex', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getUnreadImageCountStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should get unread image count with path', async () => {
    await Functions.GetCounts(knexFake, '/foo/bar/baz')
    expect(getUnreadImageCountStub.firstCall.args[1]).to.equal('/foo/bar/baz')
  })
  it('should get all image count', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.callCount).to.equal(1)
  })
  it('should get all image count with expected parameters', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should get all image count with knex', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should get all image count with path', async () => {
    await Functions.GetCounts(knexFake, '/foo/bar/bath')
    expect(getImageCountStub.firstCall.args[1]).to.equal('/foo/bar/bath')
  })
  it('should get force page 0 when unread images exist', async () => {
    getUnreadImageCountStub.resolves(99)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', 7)
    expect(result.page).that.equal(0)
  })
  it('should not get randomization when unread images exist', async () => {
    getUnreadImageCountStub.resolves(99)
    await Functions.GetCounts(knexFake, 'foo', 7)
    expect(randomStub.callCount).to.equal(0)
  })
  it('should not mutate page when unread images exist', async () => {
    getUnreadImageCountStub.resolves(99)
    const spy = Sinon.stub()
    await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(spy.callCount).to.equal(0)
  })
  it('should not get randomization from unread when unread images exist', async () => {
    getUnreadImageCountStub.resolves(99)
    getImageCountStub.resolves(999)
    const result = await Functions.GetCounts(knexFake, 'foo', 7)
    expect(result.pages).that.equal(10)
  })
  it('should set page count from unread when unread images exist', async () => {
    getUnreadImageCountStub.resolves(99)
    getImageCountStub.resolves(999)
    await Functions.GetCounts(knexFake, 'foo', 7)
    expect(randomStub.callCount).to.equal(0)
  })
  it('should pick page randomStubly when no unread images exist and current page is unset', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(999)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', undefined)
    expect(result.page).that.equal(50)
  })
  it('should get randomization when no unread images exist and current page is unset', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(999)
    Config.memorySize = 10
    await Functions.GetCounts(knexFake, 'foo', undefined)
    expect(randomStub.callCount).to.equal(1)
  })
  it('should not mutate page when no unread images exist and current page is unset', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(999)
    Config.memorySize = 10
    const spy = Sinon.stub()
    await Functions.GetCounts(knexFake, 'foo', undefined, spy)
    expect(spy.called).to.equal(false)
  })
  it('should mutate page when current page is set', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(999)
    Config.memorySize = 10
    const spy = Sinon.stub().returns(3)
    await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should mutate page when current page is set', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(999)
    Config.memorySize = 10
    const spy = Sinon.stub().returns(3)
    await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(spy.firstCall.args).to.deep.equal([7])
  })
  it('should set page as result of mutator', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(999)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', 7, () => 32)
    expect(result.page).to.equal(32)
  })
  it('should wrap page to end mutate is negative', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(1001)
    Config.memorySize = 10
    const spy = Sinon.stub().returns(-1)
    const result = await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(result.page).to.equal(100)
  })
  it('should wrap page to begin mutate is out of bounds', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(1001)
    Config.memorySize = 10
    const spy = Sinon.stub().returns(101)
    const result = await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(result.page).to.equal(0)
  })
  it('should use default mutatot when no mutator provided', async () => {
    getUnreadImageCountStub.resolves(0)
    getImageCountStub.resolves(1001)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', 7)
    expect(result.page).to.equal(7)
  })
})
