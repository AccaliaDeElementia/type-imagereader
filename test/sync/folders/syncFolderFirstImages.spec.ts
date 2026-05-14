'use sanity'

import { syncFolderFirstImages, Imports } from '#sync/folders.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/folders syncFolderFirstImages()', () => {
  let { fake: loggerFake } = createLoggerFake()
  let innerQueryBuilder = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    min: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    from: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    groupBy: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
  }
  let queryBuilder = {
    with: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    min: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    from: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    join: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    innerJoin: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    groupBy: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    orderBy: vi.fn().mockResolvedValue([]),
  }
  let queryBuilderStub = vi.fn().mockReturnValue(queryBuilder)
  let knexInstanceStub = {
    insert: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    onConflict: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    merge: vi.fn().mockResolvedValue(0),
  }
  let knexFnStub = vi.fn().mockReturnValue(knexInstanceStub)
  let knexFnFake = stubToKnex(knexFnStub)
  let chunkStub: MockInstance = vi.fn()
  beforeEach(() => {
    ;({ fake: loggerFake } = createLoggerFake())
    innerQueryBuilder = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      min: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      from: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      groupBy: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
    }
    queryBuilder = {
      with: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      min: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      from: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      join: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      innerJoin: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      groupBy: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    queryBuilderStub = vi.fn().mockReturnValue(queryBuilder)
    knexInstanceStub = {
      insert: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      onConflict: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      merge: vi.fn().mockResolvedValue(0),
    }
    knexFnStub = vi.fn().mockReturnValue(knexInstanceStub)
    knexFnFake = stubToKnex(knexFnStub)
    chunkStub = vi.fn()
    knexFnFake.queryBuilder = queryBuilderStub
    chunkStub = vi.spyOn(Imports, 'chunk').mockReturnValue([])
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call querybuilder once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilderStub.mock.calls.length).toBe(1)
  })
  it('should select from querybuilder with no arguments for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilderStub.mock.calls[0]).toHaveLength(0)
  })
  it('should call with once when creating CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.with.mock.calls.length).toBe(1)
  })
  it('should create CTE named firsts for inner select of primary sort keys', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.with.mock.calls[0]?.[0]).toBe('firsts')
  })
  it('should call select once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.select.mock.calls.length).toBe(1)
  })
  it('should select folder name in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.select.mock.calls[0]?.[0]).toBe('pictures.folder')
  })
  it('should call min once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.min.mock.calls.length).toBe(1)
  })
  it('should select minimum sortKey in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.min.mock.calls[0]?.[0]).toBe('pictures.sortKey as sortKey')
  })
  it('should call from once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.from.mock.calls.length).toBe(1)
  })
  it('should select from pictures table in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.from.mock.calls[0]?.[0]).toBe('pictures')
  })
  it('should call groupBy once in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.groupBy.mock.calls.length).toBe(1)
  })
  it('should group by foldername in CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    cast<(o: unknown) => void>(queryBuilder.with.mock.calls[0]?.[1])(innerQueryBuilder)
    expect(innerQueryBuilder.groupBy.mock.calls[0]?.[0]).toBe('pictures.folder')
  })
  it('should call select once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.mock.calls.length).toBe(1)
  })
  it('should select folder path for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.mock.calls[0]).toContain('pictures.folder as path')
  })
  it('should also select folders.folder so the upsert satisfies NOT NULL on folder', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.mock.calls[0]).toContain('folders.folder as folder')
  })
  it('should also select folders.sortKey so the upsert satisfies NOT NULL on sortKey', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.select.mock.calls[0]).toContain('folders.sortKey as sortKey')
  })
  it('should call min once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.min.mock.calls.length).toBe(1)
  })
  it('should select minimum picture path for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.min.mock.calls[0]?.[0]).toBe('pictures.path as firstPicture')
  })
  it('should call from once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.from.mock.calls.length).toBe(1)
  })
  it('should select from firsts CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.from.mock.calls[0]?.[0]).toBe('firsts')
  })
  it('should call join once when joining pictures table to CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.join.mock.calls.length).toBe(1)
  })
  it('should join pictures table to CTE', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.join.mock.calls[0]).toEqual([
      'pictures',
      { 'firsts.folder': 'pictures.folder', 'firsts.sortKey': 'pictures.sortKey' },
    ])
  })
  it('should call innerJoin once to restrict updates to existing folders', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.innerJoin.mock.calls.length).toBe(1)
  })
  it('should innerJoin folders on path to prevent inserting rows with null folder/sortKey', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.innerJoin.mock.calls[0]).toEqual(['folders', 'folders.path', 'pictures.folder'])
  })
  it('should call groupBy once for update', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.mock.calls.length).toBe(1)
  })
  it('should group by foldername to prevent duplicates when first picture has non unique sortkey', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.mock.calls[0]).toContain('pictures.folder')
  })
  it('should also group by folders.folder so non-aggregated select column is permitted by Postgres', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.mock.calls[0]).toContain('folders.folder')
  })
  it('should also group by folders.sortKey so non-aggregated select column is permitted by Postgres', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.groupBy.mock.calls[0]).toContain('folders.sortKey')
  })
  it('should call orderBy once', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.orderBy.mock.calls.length).toBe(1)
  })
  it('should order by foldername', async () => {
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(queryBuilder.orderBy.mock.calls[0]?.[0]).toEqual([{ column: 'pictures.folder' }])
  })
  it('should call chunk once for batched update', async () => {
    const results = { toUpdate: Math.random() }
    queryBuilder.orderBy.mockResolvedValue(results)
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(chunkStub.mock.calls.length).toBe(1)
  })
  it('should chunk results for batched update', async () => {
    const results = { toUpdate: Math.random() }
    queryBuilder.orderBy.mockResolvedValue(results)
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(chunkStub.mock.calls[0]?.[0]).toBe(results)
  })
  it('should call knex once per chunk when updating folders', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexFnStub.mock.calls.length).toBe(1)
  })
  it('should update folders table for each chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexFnStub.mock.calls[0]).toEqual(['folders'])
  })
  it('should call insert once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.insert.mock.calls.length).toBe(1)
  })
  it('should insert chunk data when updating folders', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.insert.mock.calls[0]?.[0]).toBe(chunk)
  })
  it('should call onConflict once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.onConflict.mock.calls.length).toBe(1)
  })
  it('should resolve conflict on path column', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.onConflict.mock.calls[0]).toEqual(['path'])
  })
  it('should call merge once per chunk', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.merge.mock.calls.length).toBe(1)
  })
  it('should merge only the firstPicture column on conflict', async () => {
    const chunk = { chunk: Math.random() }
    chunkStub.mockReturnValue([chunk])
    await syncFolderFirstImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.merge.mock.calls[0]?.[0]).toEqual(['firstPicture'])
  })
})
