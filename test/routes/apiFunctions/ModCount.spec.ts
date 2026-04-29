'use sanity'

import { expect } from 'chai'
import { Imports, ModCount, type ModCountInternals } from '#routes/apiFunctions'
import { Cast } from '#testutils/TypeGuards'
import Sinon from 'sinon'

const modCountInternals = Cast<ModCountInternals>(ModCount)

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
  it('Reset() should call Math.random once', () => {
    modCountInternals.Reset()
    expect(mathRandomSpy.callCount).to.equal(1)
  })
  it('Reset() should call Math.random with no args', () => {
    modCountInternals.Reset()
    expect(mathRandomSpy.firstCall.args).to.have.lengthOf(0)
  })
  it('Reset() should call Math.floor once to extend start location to (0, 1e10]', () => {
    modCountInternals.Reset()
    expect(mathFloorSpy.callCount).to.equal(1)
  })
  it('Reset() should call Math.floor with one argument', () => {
    modCountInternals.Reset()
    expect(mathFloorSpy.firstCall.args).to.have.lengthOf(1)
  })
  it('Reset() should extend start location to (0, 1e10] using Math.floor', () => {
    modCountInternals.Reset()
    const value = 1e10 * mathRandomSpy.firstCall.returnValue
    expect(mathFloorSpy.firstCall.args[0]).to.equal(value)
  })
  it('Reset() should return floored integer value', () => {
    const result = modCountInternals.Reset()
    const value = mathFloorSpy.firstCall.returnValue as unknown
    expect(result).to.equal(value)
  })
  it('Reset() should store floored integer value in modCount', () => {
    modCountInternals.Reset()
    const value = mathFloorSpy.firstCall.returnValue as unknown
    expect(modCountInternals.modCount).to.equal(value)
  })
  it('Reset() should log the new modcount value', () => {
    modCountInternals.Reset()
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('ModCount reset'))
    expect(matched).to.equal(true)
  })
  it('Get() It should return modcount value', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.Get()).to.equal(69420)
  })
  it('Validate() It should return true when modcount matches', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.Validate(69420)).to.equal(true)
  })
  it('Validate() It should return false when modcount mismatches', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.Validate(8675309)).to.equal(false)
  })
  it('Increment() It should increment returned modcount by one', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.Increment()).to.equal(69421)
  })
  it('Increment() It should increment stored modcount by one', () => {
    modCountInternals.modCount = 69420
    ModCount.Increment()
    expect(modCountInternals.modCount).to.equal(69421)
  })
  it('Increment() It should reset modcount on rollover', () => {
    modCountInternals.modCount = Number.MAX_SAFE_INTEGER
    expect(ModCount.Increment()).to.equal(1)
  })
  it('Increment() It should reset modcount at exact rollover boundary', () => {
    modCountInternals.modCount = Number.MAX_SAFE_INTEGER - 1
    expect(ModCount.Increment()).to.equal(1)
  })
})
