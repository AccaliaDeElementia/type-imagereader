'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards'
import { Config, Functions } from '#routes/slideshow'
import { expect } from 'chai'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow function GetCounts()', () => {
  let knexFake = StubToKnex({})
  let getImageCountStub = sandbox.stub().resolves()
  let randomStub = sandbox.stub()
  beforeEach(() => {
    Config.memorySize = 10
    knexFake = StubToKnex({})
    getImageCountStub = sandbox.stub(Functions, 'GetImageCount').resolves(0)
    randomStub = sandbox.stub(Math, 'random').returns(0.5)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call GetImageCount twice', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.callCount).to.equal(2)
  })
  it('should get unread image count with expected parameter count', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.firstCall.args).to.have.lengthOf(3)
  })
  it('should get unread image count with knex', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should get unread image count with path', async () => {
    await Functions.GetCounts(knexFake, '/foo/bar/baz')
    expect(getImageCountStub.firstCall.args[1]).to.equal('/foo/bar/baz')
  })
  it('should get unread image count with unreadOnly flag', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.firstCall.args[2]).to.equal('unread')
  })
  it('should get all image count with expected parameters', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.secondCall.args).to.have.lengthOf(2)
  })
  it('should get all image count with knex', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(getImageCountStub.secondCall.args[0]).to.equal(knexFake)
  })
  it('should get all image count with path', async () => {
    await Functions.GetCounts(knexFake, '/foo/bar/bath')
    expect(getImageCountStub.secondCall.args[1]).to.equal('/foo/bar/bath')
  })
  it('should get force page 0 when unread images exist', async () => {
    getImageCountStub.onFirstCall().resolves(99)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', 7)
    expect(result.page).that.equal(0)
  })
  it('should not get randomization when unread images exist', async () => {
    getImageCountStub.onFirstCall().resolves(99)
    await Functions.GetCounts(knexFake, 'foo', 7)
    expect(randomStub.callCount).to.equal(0)
  })
  it('should not mutate page when unread images exist', async () => {
    getImageCountStub.onFirstCall().resolves(99)
    const spy = sandbox.stub()
    await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(spy.callCount).to.equal(0)
  })
  it('should not get randomization from unread when unread images exist', async () => {
    getImageCountStub.onFirstCall().resolves(99)
    getImageCountStub.onSecondCall().resolves(999)
    const result = await Functions.GetCounts(knexFake, 'foo', 7)
    expect(result.pages).that.equal(10)
  })
  it('should set page count from unread when unread images exist', async () => {
    getImageCountStub.onFirstCall().resolves(99)
    getImageCountStub.onSecondCall().resolves(999)
    await Functions.GetCounts(knexFake, 'foo', 7)
    expect(randomStub.callCount).to.equal(0)
  })
  it('should pick page randomStubly when no unread images exist and current page is unset', async () => {
    getImageCountStub.onSecondCall().resolves(999)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', undefined)
    expect(result.page).that.equal(50)
  })
  it('should get randomization when no unread images exist and current page is unset', async () => {
    getImageCountStub.onSecondCall().resolves(999)
    Config.memorySize = 10
    await Functions.GetCounts(knexFake, 'foo', undefined)
    expect(randomStub.callCount).to.equal(1)
  })
  it('should not mutate page when no unread images exist and current page is unset', async () => {
    getImageCountStub.onSecondCall().resolves(999)
    Config.memorySize = 10
    const spy = sandbox.stub()
    await Functions.GetCounts(knexFake, 'foo', undefined, spy)
    expect(spy.called).to.equal(false)
  })
  it('should mutate page when current page is set', async () => {
    getImageCountStub.onSecondCall().resolves(999)
    Config.memorySize = 10
    const spy = sandbox.stub().returns(3)
    await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should mutate page with current page value as argument', async () => {
    getImageCountStub.onSecondCall().resolves(999)
    Config.memorySize = 10
    const spy = sandbox.stub().returns(3)
    await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(spy.firstCall.args).to.deep.equal([7])
  })
  it('should set page as result of mutator', async () => {
    getImageCountStub.onSecondCall().resolves(999)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', 7, () => 32)
    expect(result.page).to.equal(32)
  })
  it('should wrap page to end mutate is negative', async () => {
    getImageCountStub.onSecondCall().resolves(1001)
    Config.memorySize = 10
    const spy = sandbox.stub().returns(-1)
    const result = await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(result.page).to.equal(100)
  })
  it('should wrap page to begin mutate is out of bounds', async () => {
    getImageCountStub.onSecondCall().resolves(1001)
    Config.memorySize = 10
    const spy = sandbox.stub().returns(101)
    const result = await Functions.GetCounts(knexFake, 'foo', 7, spy)
    expect(result.page).to.equal(0)
  })
  it('should use default mutatot when no mutator provided', async () => {
    getImageCountStub.onSecondCall().resolves(1001)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', 7)
    expect(result.page).to.equal(7)
  })
  it('should return page 0 when folder is empty', async () => {
    const result = await Functions.GetCounts(knexFake, 'foo')
    expect(result.page).to.equal(0)
  })
  it('should return pages 0 when folder is empty', async () => {
    const result = await Functions.GetCounts(knexFake, 'foo')
    expect(result.pages).to.equal(0)
  })
  it('should not randomize page when folder is empty', async () => {
    await Functions.GetCounts(knexFake, 'foo')
    expect(randomStub.callCount).to.equal(0)
  })
  it('should not call mutator when folder is empty', async () => {
    const spy = sandbox.stub()
    await Functions.GetCounts(knexFake, 'foo', 0, spy)
    expect(spy.callCount).to.equal(0)
  })
  it('should return page 0 when folder is empty and decrement mutator is provided', async () => {
    const result = await Functions.GetCounts(knexFake, 'foo', 0, (x) => x - 1)
    expect(result.page).to.equal(0)
  })
  it('should set pages from allcount when unread count is zero', async () => {
    getImageCountStub.onSecondCall().resolves(1001)
    Config.memorySize = 10
    const result = await Functions.GetCounts(knexFake, 'foo', 7)
    expect(result.pages).to.equal(101)
  })
  it('should include unread count in result', async () => {
    getImageCountStub.onFirstCall().resolves(42)
    getImageCountStub.onSecondCall().resolves(999)
    const result = await Functions.GetCounts(knexFake, 'foo')
    expect(result.unread).to.equal(42)
  })
  it('should include total count in result', async () => {
    getImageCountStub.onSecondCall().resolves(999)
    const result = await Functions.GetCounts(knexFake, 'foo')
    expect(result.all).to.equal(999)
  })
})
