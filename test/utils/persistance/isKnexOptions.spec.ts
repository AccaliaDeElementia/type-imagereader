'use sanity'

import { expect } from 'chai'
import { TypeGuards } from '#utils/persistance.js'
import Sinon from 'sinon'

const sandbox = Sinon.createSandbox()

describe('utils/persistance function isKnexOptions()', () => {
  let isMigrationsValidStub = sandbox.stub()
  let isConnectionValid = sandbox.stub()
  let isPoolValid = sandbox.stub()
  beforeEach(() => {
    isMigrationsValidStub = sandbox.stub(TypeGuards, 'isMigrationsValid').returns(true)
    isConnectionValid = sandbox.stub(TypeGuards, 'isConnectionValid').returns(true)
    isPoolValid = sandbox.stub(TypeGuards, 'isPoolValid').returns(true)
  })
  afterEach(() => {
    sandbox.restore()
  })
  const tests: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['array', [], false],
    ['non object', 'options', false],
    ['missing client', {}, false],
    ['null client', { client: null }, false],
    ['undefined client', { client: undefined }, false],
    ['array client', { client: [] }, false],
    ['non string client', { client: 42 }, false],
    ['valid client', { client: 'sqlite', useNullAsDefault: false }, true],
    ['missing useNullAsDefault client', { client: 'sqlite' }, true],
    ['null useNullAsDefault', { client: 'sqlite', useNullAsDefault: null }, false],
    ['undefined useNullAsDefault', { client: 'sqlite', useNullAsDefault: undefined }, false],
    ['object useNullAsDefault', { client: 'sqlite', useNullAsDefault: {} }, false],
    ['array useNullAsDefault', { client: 'sqlite', useNullAsDefault: [] }, false],
    ['number useNullAsDefault', { client: 'sqlite', useNullAsDefault: 42 }, false],
    ['non boolean useNullAsDefault', { client: 'sqlite', useNullAsDefault: 'true' }, false],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(TypeGuards.isKnexOptions(input)).to.equal(expected)
    })
  })
  it('should reject when isMigrationsValidStub fails', () => {
    isMigrationsValidStub.returns(false)
    expect(TypeGuards.isKnexOptions({ client: 'sqlite' })).to.equal(false)
  })
  it('should reject when isConnectionValid fails', () => {
    isConnectionValid.returns(false)
    expect(TypeGuards.isKnexOptions({ client: 'sqlite' })).to.equal(false)
  })
  it('should reject when isPoolValid fails', () => {
    isPoolValid.returns(false)
    expect(TypeGuards.isKnexOptions({ client: 'sqlite' })).to.equal(false)
  })
})
