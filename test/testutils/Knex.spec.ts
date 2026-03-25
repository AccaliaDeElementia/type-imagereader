'use sanity'

import { expect } from 'chai'
import { createKnexChainFake } from '../../testutils/Knex'

describe('testutils/Knex createKnexChainFake()', () => {
  it('should create a stub for each chain method', () => {
    const { instance } = createKnexChainFake(['select', 'where'] as const, ['limit'] as const)
    expect(instance.select).to.be.a('function')
    expect(instance.where).to.be.a('function')
  })
  it('should create a stub for each terminal method', () => {
    const { instance } = createKnexChainFake(['select'] as const, ['limit', 'orderBy'] as const)
    expect(instance.limit).to.be.a('function')
    expect(instance.orderBy).to.be.a('function')
  })
  it('should make chain methods return the instance', () => {
    const { instance } = createKnexChainFake(['select', 'where'] as const, ['limit'] as const)
    expect(instance.select()).to.equal(instance)
    expect(instance.where()).to.equal(instance)
  })
  it('should make terminal methods resolve to empty array by default', async () => {
    const { instance } = createKnexChainFake(['select'] as const, ['limit'] as const)
    const result: unknown = await instance.limit()
    expect(result).to.deep.equal([])
  })
  it('should make all terminal methods resolve to the same defaultValue', async () => {
    const defaultValue = { foo: 'bar' }
    const { instance } = createKnexChainFake(['select'] as const, ['limit', 'orderBy'] as const, defaultValue)
    expect(await instance.limit()).to.equal(defaultValue)
    expect(await instance.orderBy()).to.equal(defaultValue)
  })
  it('should make stub return the instance on every call', () => {
    const { instance, stub } = createKnexChainFake(['select'] as const, ['limit'] as const)
    expect(stub('table1')).to.equal(instance)
    expect(stub('table2')).to.equal(instance)
  })
  it('should return fake that is same object reference as stub', () => {
    const { stub, fake } = createKnexChainFake(['select'] as const, ['limit'] as const)
    expect(fake as unknown).to.equal(stub)
  })
  it('should return independent instances on separate calls', () => {
    const { instance: a } = createKnexChainFake(['select'] as const, ['limit'] as const)
    const { instance: b } = createKnexChainFake(['select'] as const, ['limit'] as const)
    expect(a).to.not.equal(b)
  })
  it('should return independent stubs on separate calls', () => {
    const { stub: a } = createKnexChainFake(['select'] as const, ['limit'] as const)
    const { stub: b } = createKnexChainFake(['select'] as const, ['limit'] as const)
    expect(a).to.not.equal(b)
  })
  it('should start chain method call counts at zero', () => {
    const { instance } = createKnexChainFake(['select', 'where'] as const, ['limit'] as const)
    expect(instance.select.callCount).to.equal(0)
    expect(instance.where.callCount).to.equal(0)
  })
  it('should start terminal method call counts at zero', () => {
    const { instance } = createKnexChainFake(['select'] as const, ['limit'] as const)
    expect(instance.limit.callCount).to.equal(0)
  })
  it('should start stub call count at zero', () => {
    const { stub } = createKnexChainFake(['select'] as const, ['limit'] as const)
    expect(stub.callCount).to.equal(0)
  })
})
