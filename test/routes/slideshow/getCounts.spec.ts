'use sanity'

import { stubToKnex } from '#testutils/typeGuards.js'
import { Config, getCounts, Internals } from '#routes/slideshow.js'
import type { MockInstance } from 'vitest'
describe('routes/slideshow getCounts()', () => {
  let knexFake = stubToKnex({})
  let getImageCountStub = vi.fn().mockResolvedValue(undefined)
  let randomStub: MockInstance = vi.fn()
  beforeEach(() => {
    Config.memorySize = 10
    knexFake = stubToKnex({})
    getImageCountStub = vi.spyOn(Internals, 'getImageCount').mockResolvedValue(0)
    randomStub = vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  it('should call getImageCount twice', async () => {
    await getCounts(knexFake, 'foo')
    expect(getImageCountStub.mock.calls.length).toBe(2)
  })
  it('should get unread image count with expected parameter count', async () => {
    await getCounts(knexFake, 'foo')
    expect(getImageCountStub.mock.calls[0]).toHaveLength(3)
  })
  it('should get unread image count with knex', async () => {
    await getCounts(knexFake, 'foo')
    expect(getImageCountStub.mock.calls[0]?.[0]).toBe(knexFake)
  })
  it('should get unread image count with path', async () => {
    await getCounts(knexFake, '/foo/bar/baz')
    expect(getImageCountStub.mock.calls[0]?.[1]).toBe('/foo/bar/baz')
  })
  it('should get unread image count with unreadOnly flag', async () => {
    await getCounts(knexFake, 'foo')
    expect(getImageCountStub.mock.calls[0]?.[2]).toBe('unread')
  })
  it('should get all image count with expected parameters', async () => {
    await getCounts(knexFake, 'foo')
    expect(getImageCountStub.mock.calls[1]).toHaveLength(2)
  })
  it('should get all image count with knex', async () => {
    await getCounts(knexFake, 'foo')
    expect(getImageCountStub.mock.calls[1]?.[0]).toBe(knexFake)
  })
  it('should get all image count with path', async () => {
    await getCounts(knexFake, '/foo/bar/bath')
    expect(getImageCountStub.mock.calls[1]?.[1]).toBe('/foo/bar/bath')
  })
  it('should get force page 0 when unread images exist', async () => {
    getImageCountStub.mockResolvedValueOnce(99)
    Config.memorySize = 10
    const result = await getCounts(knexFake, 'foo', 7)
    expect(result.page).toBe(0)
  })
  it('should not get randomization when unread images exist', async () => {
    getImageCountStub.mockResolvedValueOnce(99)
    await getCounts(knexFake, 'foo', 7)
    expect(randomStub.mock.calls.length).toBe(0)
  })
  it('should not mutate page when unread images exist', async () => {
    getImageCountStub.mockResolvedValueOnce(99)
    const spy = vi.fn()
    await getCounts(knexFake, 'foo', 7, spy)
    expect(spy.mock.calls.length).toBe(0)
  })
  it('should not get randomization from unread when unread images exist', async () => {
    getImageCountStub.mockResolvedValueOnce(99)
    getImageCountStub.mockResolvedValueOnce(999)
    const result = await getCounts(knexFake, 'foo', 7)
    expect(result.pages).toBe(10)
  })
  it('should set page count from unread when unread images exist', async () => {
    getImageCountStub.mockResolvedValueOnce(99)
    getImageCountStub.mockResolvedValueOnce(999)
    await getCounts(knexFake, 'foo', 7)
    expect(randomStub.mock.calls.length).toBe(0)
  })
  it('should pick page randomStubly when no unread images exist and current page is unset', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(999)
    Config.memorySize = 10
    const result = await getCounts(knexFake, 'foo', undefined)
    expect(result.page).toBe(50)
  })
  it('should get randomization when no unread images exist and current page is unset', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(999)
    Config.memorySize = 10
    await getCounts(knexFake, 'foo', undefined)
    expect(randomStub.mock.calls.length).toBe(1)
  })
  it('should not mutate page when no unread images exist and current page is unset', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(999)
    Config.memorySize = 10
    const spy = vi.fn()
    await getCounts(knexFake, 'foo', undefined, spy)
    expect(spy.mock.calls.length > 0).toBe(false)
  })
  it('should mutate page when current page is set', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(999)
    Config.memorySize = 10
    const spy = vi.fn().mockReturnValue(3)
    await getCounts(knexFake, 'foo', 7, spy)
    expect(spy.mock.calls.length).toBe(1)
  })
  it('should mutate page with current page value as argument', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(999)
    Config.memorySize = 10
    const spy = vi.fn().mockReturnValue(3)
    await getCounts(knexFake, 'foo', 7, spy)
    expect(spy.mock.calls[0]).toEqual([7])
  })
  it('should set page as result of mutator', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(999)
    Config.memorySize = 10
    const result = await getCounts(knexFake, 'foo', 7, () => 32)
    expect(result.page).toBe(32)
  })
  it('should wrap page to end mutate is negative', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(1001)
    Config.memorySize = 10
    const spy = vi.fn().mockReturnValue(-1)
    const result = await getCounts(knexFake, 'foo', 7, spy)
    expect(result.page).toBe(100)
  })
  it('should wrap page to begin mutate is out of bounds', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(1001)
    Config.memorySize = 10
    const spy = vi.fn().mockReturnValue(101)
    const result = await getCounts(knexFake, 'foo', 7, spy)
    expect(result.page).toBe(0)
  })
  it('should use default mutatot when no mutator provided', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(1001)
    Config.memorySize = 10
    const result = await getCounts(knexFake, 'foo', 7)
    expect(result.page).toBe(7)
  })
  it('should return page 0 when folder is empty', async () => {
    const result = await getCounts(knexFake, 'foo')
    expect(result.page).toBe(0)
  })
  it('should return pages 0 when folder is empty', async () => {
    const result = await getCounts(knexFake, 'foo')
    expect(result.pages).toBe(0)
  })
  it('should not randomize page when folder is empty', async () => {
    await getCounts(knexFake, 'foo')
    expect(randomStub.mock.calls.length).toBe(0)
  })
  it('should not call mutator when folder is empty', async () => {
    const spy = vi.fn()
    await getCounts(knexFake, 'foo', 0, spy)
    expect(spy.mock.calls.length).toBe(0)
  })
  it('should return page 0 when folder is empty and decrement mutator is provided', async () => {
    const result = await getCounts(knexFake, 'foo', 0, (x) => x - 1)
    expect(result.page).toBe(0)
  })
  it('should set pages from allcount when unread count is zero', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(1001)
    Config.memorySize = 10
    const result = await getCounts(knexFake, 'foo', 7)
    expect(result.pages).toBe(101)
  })
  it('should include unread count in result', async () => {
    getImageCountStub.mockResolvedValueOnce(42)
    getImageCountStub.mockResolvedValueOnce(999)
    const result = await getCounts(knexFake, 'foo')
    expect(result.unread).toBe(42)
  })
  it('should include total count in result', async () => {
    getImageCountStub.mockResolvedValueOnce(0).mockResolvedValueOnce(999)
    const result = await getCounts(knexFake, 'foo')
    expect(result.all).toBe(999)
  })
})
