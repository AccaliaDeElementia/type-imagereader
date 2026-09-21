'use sanity'

import { setLatestPicture, Imports, Internals } from '#routes/apiFunctions.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

interface KnexStub {
  select: MockInstance
  increment: MockInstance
  update: MockInstance
  whereIn: MockInstance
  orWhere: MockInstance
  where: MockInstance
  limit: MockInstance
}

const PICTURE_PATH = '/foo/bar/image.pdf'
const PARENT_FOLDER = '/foo/bar/'

const makeKnexInstance = (): KnexStub => {
  const inst: KnexStub = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    increment: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    update: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereIn: vi.fn().mockResolvedValue([]),
    orWhere: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
    where: vi.fn(),
  }
  inst.where.mockImplementation(() => inst)
  return inst
}

describe('routes/apiFunctions setLatestPicture', () => {
  let knexStub: MockInstance = vi.fn()
  let knexFake = stubToKnex(knexStub)
  let claimUnseenPictureStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    knexStub = vi.fn().mockImplementation(() => stubToKnex(makeKnexInstance()))
    knexFake = stubToKnex(knexStub)
    claimUnseenPictureStub = vi.spyOn(Internals, 'claimUnseenPicture').mockResolvedValue(undefined)
    loggerStub = vi.spyOn(Imports, 'logger').mockReturnValue(undefined)
  })
  const setupExistingPicture = (): KnexStub => {
    const searcher = makeKnexInstance()
    searcher.limit.mockResolvedValue([{ path: PICTURE_PATH }])
    knexStub.mockReturnValueOnce(searcher)
    return searcher
  }

  describe('the existence check', () => {
    let instance = makeKnexInstance()
    beforeEach(async () => {
      instance = makeKnexInstance()
      knexStub.mockReturnValueOnce(instance)
      await setLatestPicture(knexFake, PICTURE_PATH)
    })
    it('should query the pictures table', () => {
      expect(knexStub.mock.calls[0]).toEqual(['pictures'])
    })
    const expectedCalls: Array<[string, keyof KnexStub, unknown[]]> = [
      ['select the path column', 'select', ['path']],
      ['filter by the requested path', 'where', [{ path: PICTURE_PATH }]],
      ['limit the lookup to a single record', 'limit', [1]],
    ]
    expectedCalls.forEach(([label, method, args]: [string, keyof KnexStub, unknown[]]): void => {
      it(`should ${label} exactly once`, () => {
        expect(instance[method].mock.calls).toEqual([args])
      })
    })
  })

  describe('when the picture is not found', () => {
    it('should resolve to null without issuing a further query', async () => {
      const result = await setLatestPicture(knexFake, PICTURE_PATH)
      expect({ result, queries: knexStub.mock.calls.length }).toEqual({ result: null, queries: 1 })
    })
    it('should log that the picture was not found', async () => {
      await setLatestPicture(knexFake, PICTURE_PATH)
      const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('setLatestPicture: picture not found'))
      expect(matched).toBe(true)
    })
    it('should not claim the picture', async () => {
      await setLatestPicture(knexFake, PICTURE_PATH)
      expect(claimUnseenPictureStub.mock.calls.length).toBe(0)
    })
  })

  describe('when the picture exists', () => {
    let updater = makeKnexInstance()
    beforeEach(async () => {
      setupExistingPicture()
      updater = makeKnexInstance()
      knexStub.mockReturnValueOnce(updater)
      await setLatestPicture(knexFake, PICTURE_PATH)
    })
    it('should claim the picture once with the provided knex and path', () => {
      expect(claimUnseenPictureStub.mock.calls).toEqual([[knexFake, PICTURE_PATH]])
    })
    it('should query the folders table to update the current cover', () => {
      expect(knexStub.mock.calls[1]).toEqual(['folders'])
    })
    it('should set folders.current to the picture path exactly once', () => {
      expect(updater.update.mock.calls).toEqual([[{ current: PICTURE_PATH }]])
    })
    it('should filter the folders update by the parent folder path', () => {
      expect(updater.where.mock.calls[0]).toEqual([{ path: PARENT_FOLDER }])
    })
  })
})
