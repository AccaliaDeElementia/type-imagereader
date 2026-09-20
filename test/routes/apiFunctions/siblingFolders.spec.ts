'use sanity'

import { getNextFolder, getPreviousFolder, Internals, type SiblingFolderSearch } from '#routes/apiFunctions.js'
import { cast } from '#testutils/typeGuards.js'
import { createKnexChainFake } from '#testutils/knex.js'
import assert from 'node:assert'
import type { Knex } from 'knex'
import type { Folder } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

interface SiblingCase {
  name: string
  getFolder: (knex: Knex, path: string, sortKey: string) => Promise<Folder | null>
  direction: string
}

const siblings: SiblingCase[] = [
  { name: 'getNextFolder', getFolder: getNextFolder, direction: 'asc' },
  { name: 'getPreviousFolder', getFolder: getPreviousFolder, direction: 'desc' },
]

describe.each(siblings)('routes/apiFunctions $name', ({ getFolder, direction }: SiblingCase) => {
  let { fake: knexFake } = createKnexChainFake([] as const, [] as const)
  let getDirectionFolderStub: MockInstance = vi.fn()
  beforeEach(() => {
    ;({ fake: knexFake } = createKnexChainFake([] as const, [] as const))
    getDirectionFolderStub = vi.spyOn(Internals, 'getDirectionFolder').mockResolvedValue(null)
  })
  it('should call getDirectionFolder to do actual query', async () => {
    await getFolder(knexFake, '/foo', 'foo')
    expect(getDirectionFolderStub.mock.calls.length).toBe(1)
  })
  it('should pass the knex parameter to the actual query', async () => {
    await getFolder(knexFake, '/foo', 'foo')
    expect(getDirectionFolderStub.mock.calls[0]?.[0]).toBe(knexFake)
  })
  const paramTests: Array<[string, string, keyof SiblingFolderSearch, string]> = [
    ['path parameter', '/foo', 'path', '/foo'],
    ['sortkey parameter', 'foo90210', 'sortKey', 'foo90210'],
    ['direction parameter', 'foo', 'direction', direction],
    ['type parameter', 'foo', 'type', 'all'],
  ]
  paramTests.forEach(([title, sortKey, prop, expected]) => {
    it(`should pass the ${title} to the actual query`, async () => {
      await getFolder(knexFake, '/foo', sortKey)
      const param = cast<SiblingFolderSearch | undefined>(getDirectionFolderStub.mock.calls[0]?.[1])
      assert(param !== undefined)
      expect(param[prop]).toBe(expected)
    })
  })
  it('should resolve as result of actual query', async () => {
    const data = { data: Math.random() }
    getDirectionFolderStub.mockResolvedValue(data)
    const result = await getFolder(knexFake, '/foo', 'foo')
    expect(result).toBe(data)
  })
})
