'use sanity'

import { expect } from 'chai'

import { createResponseFake } from '#testutils/Express'

describe('testutils/Express createResponseFake()', () => {
  it('should return a stub with a status method', () => {
    const { stub } = createResponseFake()
    expect(stub.status).to.be.a('function')
  })
  it('should return a stub with a json method', () => {
    const { stub } = createResponseFake()
    expect(stub.json).to.be.a('function')
  })
  it('should return a stub with a send method', () => {
    const { stub } = createResponseFake()
    expect(stub.send).to.be.a('function')
  })
  it('should return a stub with an end method', () => {
    const { stub } = createResponseFake()
    expect(stub.end).to.be.a('function')
  })
  it('should return a stub with a render method', () => {
    const { stub } = createResponseFake()
    expect(stub.render).to.be.a('function')
  })
  it('should return a stub with a set method', () => {
    const { stub } = createResponseFake()
    expect(stub.set).to.be.a('function')
  })
  it('should start with status callCount of 0', () => {
    const { stub } = createResponseFake()
    expect(stub.status.callCount).to.equal(0)
  })
  it('should start with json callCount of 0', () => {
    const { stub } = createResponseFake()
    expect(stub.json.callCount).to.equal(0)
  })
  it('should start with send callCount of 0', () => {
    const { stub } = createResponseFake()
    expect(stub.send.callCount).to.equal(0)
  })
  it('should start with end callCount of 0', () => {
    const { stub } = createResponseFake()
    expect(stub.end.callCount).to.equal(0)
  })
  it('should start with render callCount of 0', () => {
    const { stub } = createResponseFake()
    expect(stub.render.callCount).to.equal(0)
  })
  it('should start with set callCount of 0', () => {
    const { stub } = createResponseFake()
    expect(stub.set.callCount).to.equal(0)
  })
  it('should have status return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.status(200)).to.equal(fake)
  })
  it('should have json return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.json({})).to.equal(fake)
  })
  it('should have send return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.send('')).to.equal(fake)
  })
  it('should have end return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.end()).to.equal(fake)
  })
  it('should have render return a promise resolving to fake for method chaining', async () => {
    const { stub, fake } = createResponseFake()
    expect(await stub.render('view')).to.equal(fake)
  })
  it('should have set return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.set('key', 'value')).to.equal(fake)
  })
  it('should return independent stubs on each call', () => {
    const a = createResponseFake()
    const b = createResponseFake()
    a.stub.status(200)
    expect(b.stub.status.callCount).to.equal(0)
  })
  it('should return fake that is the same object reference as stub', () => {
    const { stub, fake } = createResponseFake()
    expect(fake as unknown).to.equal(stub)
  })
})
