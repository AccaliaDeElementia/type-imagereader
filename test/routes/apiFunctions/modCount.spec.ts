'use sanity'

import { expect } from 'chai'
import { Imports, ModCount, type ModCountInternals } from '#routes/apiFunctions.js'
import { cast } from '#testutils/typeGuards.js'
import Sinon from 'sinon'

const modCountInternals = cast<ModCountInternals>(ModCount)

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions ModCount functions', () => {
  let mathFloorSpy = Sinon.spy()
  let mathRandomSpy = Sinon.spy()
  let loggerStub: Sinon.SinonStub = sandbox.stub()
  beforeEach(() => {
    mathFloorSpy = sandbox.spy(Math, 'floor')
    mathRandomSpy = sandbox.spy(Math, 'random')
    modCountInternals.modCount = 5050
    loggerStub = sandbox.stub(Imports, 'logger')
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('reset() should call Math.random once', () => {
    modCountInternals.reset()
    expect(mathRandomSpy.callCount).to.equal(1)
  })
  it('reset() should call Math.random with no args', () => {
    modCountInternals.reset()
    expect(mathRandomSpy.firstCall.args).to.have.lengthOf(0)
  })
  it('reset() should call Math.floor once to extend start location to (0, 1e10]', () => {
    modCountInternals.reset()
    expect(mathFloorSpy.callCount).to.equal(1)
  })
  it('reset() should call Math.floor with one argument', () => {
    modCountInternals.reset()
    expect(mathFloorSpy.firstCall.args).to.have.lengthOf(1)
  })
  it('reset() should extend start location to (0, 1e10] using Math.floor', () => {
    modCountInternals.reset()
    const value = 1e10 * mathRandomSpy.firstCall.returnValue
    expect(mathFloorSpy.firstCall.args[0]).to.equal(value)
  })
  it('reset() should return floored integer value', () => {
    const result = modCountInternals.reset()
    const value = mathFloorSpy.firstCall.returnValue as unknown
    expect(result).to.equal(value)
  })
  it('reset() should store floored integer value in modCount', () => {
    modCountInternals.reset()
    const value = mathFloorSpy.firstCall.returnValue as unknown
    expect(modCountInternals.modCount).to.equal(value)
  })
  it('reset() should log the new modcount value', () => {
    modCountInternals.reset()
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('ModCount reset'))
    expect(matched).to.equal(true)
  })
  it('get() It should return modcount value', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.get()).to.equal(69420)
  })
  it('validateAndIncrement() should return null when modcount mismatches', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.validateAndIncrement(8675309)).to.equal(null)
  })
  it('validateAndIncrement() should not change stored modcount when mismatch', () => {
    modCountInternals.modCount = 69420
    ModCount.validateAndIncrement(8675309)
    expect(modCountInternals.modCount).to.equal(69420)
  })
  it('validateAndIncrement() should return incremented modcount when match', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.validateAndIncrement(69420)).to.equal(69421)
  })
  it('validateAndIncrement() should update stored modcount when match', () => {
    modCountInternals.modCount = 69420
    ModCount.validateAndIncrement(69420)
    expect(modCountInternals.modCount).to.equal(69421)
  })
  it('validateAndIncrement() should reset modcount on rollover', () => {
    modCountInternals.modCount = Number.MAX_SAFE_INTEGER
    expect(ModCount.validateAndIncrement(Number.MAX_SAFE_INTEGER)).to.equal(1)
  })
  it('validateAndIncrement() should reset modcount at exact rollover boundary', () => {
    modCountInternals.modCount = Number.MAX_SAFE_INTEGER - 1
    expect(ModCount.validateAndIncrement(Number.MAX_SAFE_INTEGER - 1)).to.equal(1)
  })
})
