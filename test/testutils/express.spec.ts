'use sanity'

import { createResponseFake } from '#testutils/express.js'

describe('testutils/Express createResponseFake()', () => {
  it('should return a stub with a status method', () => {
    const { stub } = createResponseFake()
    expect(stub.status).toBeTypeOf('function')
  })
  it('should return a stub with a json method', () => {
    const { stub } = createResponseFake()
    expect(stub.json).toBeTypeOf('function')
  })
  it('should return a stub with a send method', () => {
    const { stub } = createResponseFake()
    expect(stub.send).toBeTypeOf('function')
  })
  it('should return a stub with an end method', () => {
    const { stub } = createResponseFake()
    expect(stub.end).toBeTypeOf('function')
  })
  it('should return a stub with a render method', () => {
    const { stub } = createResponseFake()
    expect(stub.render).toBeTypeOf('function')
  })
  it('should return a stub with a set method', () => {
    const { stub } = createResponseFake()
    expect(stub.set).toBeTypeOf('function')
  })
  it('should have status return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.status(200)).toBe(fake)
  })
  it('should have json return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.json({})).toBe(fake)
  })
  it('should have send return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.send('')).toBe(fake)
  })
  it('should have end return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.end()).toBe(fake)
  })
  it('should have render return a promise resolving to fake for method chaining', async () => {
    const { stub, fake } = createResponseFake()
    expect(await stub.render('view')).toBe(fake)
  })
  it('should have set return fake for method chaining', () => {
    const { stub, fake } = createResponseFake()
    expect(stub.set('key', 'value')).toBe(fake)
  })
  it('should return independent stubs on each call', () => {
    const a = createResponseFake()
    const b = createResponseFake()
    a.stub.status(200)
    expect(b.stub.status.mock.calls.length).toBe(0)
  })
  it('should return fake that is the same object reference as stub', () => {
    const { stub, fake } = createResponseFake()
    expect(fake as unknown).toBe(stub)
  })
})
