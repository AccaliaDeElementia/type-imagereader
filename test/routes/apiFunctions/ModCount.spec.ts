'use sanity'

import { expect } from 'chai'
import { ModCount } from '#routes/apiFunctions'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

describe('routes/apiFunctions ModCount functions', () => {
  let mathFloorSpy = Sinon.spy()
  let mathRandomSpy = Sinon.spy()
  beforeEach(() => {
    mathFloorSpy = sandbox.spy(Math, 'floor')
    mathRandomSpy = sandbox.spy(Math, 'random')
    ModCount._modCount = 5050
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('Reset() should call Math.random once', () => {
    ModCount._Reset()
    expect(mathRandomSpy.callCount).to.equal(1)
  })
  it('Reset() should call Math.random with no args', () => {
    ModCount._Reset()
    expect(mathRandomSpy.firstCall.args).to.have.lengthOf(0)
  })
  it('Reset() should call Math.floor once to extend start location to (0, 1e10]', () => {
    ModCount._Reset()
    expect(mathFloorSpy.callCount).to.equal(1)
  })
  it('Reset() should call Math.floor with one argument', () => {
    ModCount._Reset()
    expect(mathFloorSpy.firstCall.args).to.have.lengthOf(1)
  })
  it('Reset() should extend start location to (0, 1e10] using Math.floor', () => {
    ModCount._Reset()
    const value = 1e10 * mathRandomSpy.firstCall.returnValue
    expect(mathFloorSpy.firstCall.args[0]).to.equal(value)
  })
  it('Reset() should return floored integer value', () => {
    const result = ModCount._Reset()
    const value = mathFloorSpy.firstCall.returnValue as unknown
    expect(result).to.equal(value)
  })
  it('Reset() should store floored integer value in modCount', () => {
    ModCount._Reset()
    const value = mathFloorSpy.firstCall.returnValue as unknown
    expect(ModCount._modCount).to.equal(value)
  })
  it('Get() It should return modcount value', () => {
    ModCount._modCount = 69420
    expect(ModCount.Get()).to.equal(69420)
  })
  it('Validate() It should return true when modcount matches', () => {
    ModCount._modCount = 69420
    expect(ModCount.Validate(69420)).to.equal(true)
  })
  it('Validate() It should return false when modcount mismatches', () => {
    ModCount._modCount = 69420
    expect(ModCount.Validate(8675309)).to.equal(false)
  })
  it('Increment() It should increment returned modcount by one', () => {
    ModCount._modCount = 69420
    expect(ModCount.Increment()).to.equal(69421)
  })
  it('Increment() It should increment stored modcount by one', () => {
    ModCount._modCount = 69420
    ModCount.Increment()
    expect(ModCount._modCount).to.equal(69421)
  })
  it('Increment() It should reset modcount on rollover', () => {
    ModCount._modCount = Number.MAX_SAFE_INTEGER
    expect(ModCount.Increment()).to.equal(1)
  })
  it('Increment() It should reset modcount at exact rollover boundary', () => {
    ModCount._modCount = Number.MAX_SAFE_INTEGER - 1
    expect(ModCount.Increment()).to.equal(1)
  })
})
