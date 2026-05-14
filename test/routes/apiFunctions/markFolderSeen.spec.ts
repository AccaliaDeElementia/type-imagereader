'use sanity'

import { markFolderSeen, Imports } from '#routes/apiFunctions.js'
import type { Knex } from 'knex'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import type { MockInstance } from 'vitest'

const chainMethods = ['select', 'increment', 'update', 'where'] as const
const terminalMethods = ['whereIn', 'orWhere', 'andWhere'] as const
describe('routes/apiFunctions markFolderSeen', () => {
  let knexStub: MockInstance = vi.fn()
  let knexFake = stubToKnex(knexStub)
  let knexRawStub: MockInstance = vi.fn()
  let getParentFoldersStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    knexStub = vi.fn().mockImplementation(() => createKnexChainFake(chainMethods, terminalMethods).instance)
    knexFake = stubToKnex(knexStub)
    knexRawStub = vi.fn()
    knexFake.raw = cast<Knex.RawBuilder<Record<string, never>, unknown>>(knexRawStub)
    getParentFoldersStub = vi.spyOn(Imports, 'getParentFolders').mockReturnValue([])
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('with markAsSeen = true', () => {
    it('should update pictures table once to set pictures read', async () => {
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls.length).toBe(1)
    })
    it('should update pictures table with expected args to set pictures read', async () => {
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls[0]).toEqual(['pictures'])
    })
    it('should update setting seen flag once for called path', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.mock.calls.length).toBe(1)
    })
    it('should update setting seen flag with expected args for called path', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.mock.calls[0]).toEqual([{ seen: true }])
    })
    it('should update filtering only unseen pictures once for called path', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.mock.calls.length).toBe(1)
    })
    it('should update filtering only unseen pictures with expected args for called path', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.mock.calls[0]).toEqual([{ seen: false }])
    })
    it('should update filtering paths prefixed with called path once', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.andWhere.mock.calls.length).toBe(1)
    })
    it('should update filtering paths prefixed with called path with expected args', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.andWhere.mock.calls[0]).toEqual(['folder', 'like', '/foo/bar/baz/quux/%'])
    })
    it('should query folders table 3 times when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls.length).toBe(3)
    })
    it('should query folders table on second call when updating parent seenCount', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls[1]).toEqual(['folders'])
    })
    it('should increment seenCount once when updating parent folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(query).mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.increment.mock.calls.length).toBe(1)
    })
    it('should increment seenCount with positive update count when marking as seen', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(query).mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.increment.mock.calls[0]).toEqual(['seenCount', 3.1415926])
    })
    it('should use getParentFolders once to find parent folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(query).mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(getParentFoldersStub.mock.calls.length).toBe(1)
    })
    it('should use getParentFolders with expected args to find parent folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(query).mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(getParentFoldersStub.mock.calls[0]).toEqual(['/foo/bar/baz/quux/'])
    })
    it('should filter folders in list of parent folders once when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(query).mockReturnValueOnce(instance)
      getParentFoldersStub.mockReturnValue('FOOBAR')
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.whereIn.mock.calls.length).toBe(1)
    })
    it('should filter folders in list of parent folders with expected args when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(query).mockReturnValueOnce(instance)
      getParentFoldersStub.mockReturnValue('FOOBAR')
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.whereIn.mock.calls[0]).toEqual(['path', 'FOOBAR'])
    })
    it('should query folders table on third call when updating child seenCount', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls.length).toBe(3)
    })
    it('should query folders table with expected args on third call when updating child seenCount', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls[2]).toEqual(['folders'])
    })
    it('should use knexRaw once to update seen count for child folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexRawStub.mock.calls.length).toBe(1)
    })
    it('should use knexRaw with expected args to update seen count for child folders when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexRawStub.mock.calls[0]).toEqual(['"totalCount"'])
    })
    it('should update once with knexRaw result for child seen count when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      knexRawStub.mockReturnValue(2.71828)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.mock.calls.length).toBe(1)
    })
    it('should update with knexRaw result for child seen count when updates update pictures', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      knexRawStub.mockReturnValue(2.71828)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.update.mock.calls[0]).toEqual([{ seenCount: 2.71828 }])
    })
    it('should filter child folders once when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      knexRawStub.mockReturnValue(2.71828)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.mock.calls.length).toBe(1)
    })
    it('should filter child folders with expected args when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      knexRawStub.mockReturnValue(2.71828)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.where.mock.calls[0]).toEqual(['path', 'like', '/foo/bar/baz/quux/%'])
    })
    it('should include selected folder once when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      knexRawStub.mockReturnValue(2.71828)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.orWhere.mock.calls.length).toBe(1)
    })
    it('should include selected folder with expected args when updating seen count for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      knexRawStub.mockReturnValue(2.71828)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(instance.orWhere.mock.calls[0]).toEqual([{ path: '/foo/bar/baz/quux/' }])
    })
    it('should update folders when exactly one picture is marked read', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(1)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls.length).toBe(3)
    })
    it('should not update folders when update count is zero', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(0)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls.length).toBe(1)
    })
    it('should not update folders when update count is negative', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(-1)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
      expect(knexStub.mock.calls.length).toBe(1)
    })
  })
  describe('with markAsSeen = false', () => {
    it('should update setting seen flag to false', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.update.mock.calls[0]).toEqual([{ seen: false }])
    })
    it('should filter only seen pictures', async () => {
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.where.mock.calls[0]).toEqual([{ seen: true }])
    })
    it('should decrement seenCount for parent folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub.mockReturnValueOnce(query).mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.increment.mock.calls[0]).toEqual(['seenCount', -3.1415926])
    })
    it('should reset seenCount and current for child folders', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      const { instance } = createKnexChainFake(chainMethods, terminalMethods)
      knexStub
        .mockReturnValueOnce(query)
        .mockReturnValueOnce(createKnexChainFake(chainMethods, terminalMethods).instance)
        .mockReturnValueOnce(instance)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(instance.update.mock.calls[0]).toEqual([{ seenCount: 0, current: null }])
    })
    it('should not use knexRaw when marking as unseen', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(3.1415926)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexRawStub.mock.calls.length).toBe(0)
    })
    it('should update folders when exactly one picture is marked unread', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(1)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexStub.mock.calls.length).toBe(3)
    })
    it('should not update folders when update count is zero', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(0)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexStub.mock.calls.length).toBe(1)
    })
    it('should not update folders when update count is negative', async () => {
      const query = createKnexChainFake(chainMethods, terminalMethods).instance
      query.andWhere.mockResolvedValue(-1)
      knexStub.mockReturnValueOnce(query)
      await markFolderSeen(knexFake, '/foo/bar/baz/quux/', false)
      expect(knexStub.mock.calls.length).toBe(1)
    })
  })
  it('should log when zero rows are updated for marking seen', async () => {
    const query = createKnexChainFake(chainMethods, terminalMethods).instance
    query.andWhere.mockResolvedValue(0)
    knexStub.mockReturnValueOnce(query)
    await markFolderSeen(knexFake, '/foo/bar/baz/quux/', true)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('markFolderSeen: no rows updated'))
    expect(matched).toBe(true)
  })
})
