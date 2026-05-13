'use sanity'

import { initialize, Internals, Imports, Persistence, type KnexOptions } from '#utils/persistence.js'
import { eventuallyRejects } from '#testutils/errors.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('utils/persistence initialize()', () => {
  let fakeEnvironment: KnexOptions = {
    client: 'fakeClient',
    connection: {
      host: 'fake host',
    },
    migrations: {
      tableName: 'migrations tablename',
    },
  }
  let stubEnvironment: MockInstance = vi.fn()
  let stubKnex: MockInstance = vi.fn()
  let stubKnexInstance = {
    migrate: {
      latest: vi.fn().mockResolvedValue(undefined),
    },
  }

  beforeEach(() => {
    Persistence.initializer = undefined
    fakeEnvironment = {
      client: 'fakeClient',
      connection: {
        host: 'fake host',
      },
      migrations: {
        tableName: 'migrations tablename',
      },
    }
    stubKnexInstance = {
      migrate: {
        latest: vi.fn().mockResolvedValue(undefined),
      },
    }
    stubKnex = vi.spyOn(Imports, 'knex').mockReturnValue(stubToKnex(stubKnexInstance))
    stubEnvironment = vi.spyOn(Internals, 'getKnexConfig').mockResolvedValue(fakeEnvironment)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should return stored initializer when one is already created', async () => {
    const promise = Promise.resolve(stubToKnex(stubKnexInstance))
    Persistence.initializer = promise
    expect(await initialize()).toBe(stubKnexInstance)
  })
  it('should not call knex when an initializer is already stored', async () => {
    const promise = Promise.resolve(stubToKnex(stubKnexInstance))
    Persistence.initializer = promise
    await initialize()
    expect(stubKnex).not.toHaveBeenCalled()
  })
  it('should set stored Initializer when empty', async () => {
    initialize().catch(() => null)
    expect(await Persistence.initializer).toBe(stubKnexInstance)
  })
  it('should resolve to knex instance', async () => {
    const knex = await initialize()
    expect(knex).toBe(stubKnexInstance)
  })
  it('should pass config to knex initializer', async () => {
    await initialize()
    expect(stubKnex).toHaveBeenCalledWith(fakeEnvironment)
  })
  it('should run knex migrations', async () => {
    await initialize()
    expect(stubKnexInstance.migrate.latest).toHaveBeenCalled()
  })
  it('should reject when reading config fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.mockRejectedValue(err)
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when reading config throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubEnvironment.mockImplementation(() => {
      throw err
    })
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when creating Knex  fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnex.mockImplementation(() => {
      throw err
    })
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when migrating to latest fails', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.mockRejectedValue(err)
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
  it('should reject when migrating to latest throws', async () => {
    const err = new Error('YOU FOOLISH FOOL!')
    stubKnexInstance.migrate.latest.mockImplementation(() => {
      throw err
    })
    const result = await eventuallyRejects(initialize())
    expect(result).toBe(err)
  })
})
