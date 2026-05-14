'use sanity'

import { Imports, Internals, Navigation } from '#public/scripts/app/navigation.js'
import { cast } from '#testutils/typeGuards.js'
import { eventuallyFulfills } from '#testutils/errors.js'
import { publishedData } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

describe('public/app/navigation navigateTo()', () => {
  let publishStub: MockInstance = vi.fn()
  let loadDataSpy: MockInstance = vi.fn()
  beforeEach(() => {
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    loadDataSpy = vi.spyOn(Internals, 'loadData').mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const invalidPaths: Array<[string, string | undefined]> = [
    ['empty', ''],
    ['undefined', undefined],
    ['null', cast<string>(null)],
  ]
  invalidPaths.forEach(([title, path]) => {
    it(`should publish error when path is ${title}`, async () => {
      await Internals.navigateTo(path, 'FOO')
      expect(publishStub.mock.calls.some((c) => c[0] === 'Loading:Error')).toBe(true)
    })
  })
  it('should publish error message when path is invalid', async () => {
    await Internals.navigateTo('', 'FOO')
    expect(publishedData(publishStub, 'Loading:Error')).toBe('Action FOO has no target')
  })
  it('should not alter current location when path is invalid', async () => {
    const data = { path: '/FOO', name: 'foo', parent: '/' }
    Navigation.current = data
    await Internals.navigateTo('', 'FOO')
    expect(Navigation.current).toBe(data)
  })
  it('should not load data when path is invalid', async () => {
    await Internals.navigateTo('', 'FOO')
    expect(loadDataSpy.mock.calls.length > 0).toBe(false)
  })
  it('should alter current location when path is valid', async () => {
    Navigation.current = { path: '/FOO', name: 'foo', parent: '/' }
    await Internals.navigateTo('/bar/121', 'FOO')
    expect(Navigation.current).toEqual({ path: '/bar/121', name: '', parent: '' })
  })
  it('should load data when path is valid', async () => {
    await Internals.navigateTo('/foo', 'FOO')
    expect(loadDataSpy.mock.calls.length > 0).toBe(true)
  })
  it('should load data in default mode when path is valid', async () => {
    await Internals.navigateTo('/foo', 'FOO')
    expect(loadDataSpy.mock.calls[0]).toHaveLength(0)
  })
  it('should swallow error when loadData rejects', async () => {
    loadDataSpy.mockRejectedValue('FOO')
    await eventuallyFulfills(Internals.navigateTo('/foo', 'FOO'))
  })
})
