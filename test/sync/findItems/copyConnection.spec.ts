'use sanity'

import { Imports } from '#sync/findItems.js'
import { cast } from '#testutils/typeGuards.js'
import type { Knex } from 'knex'
import type { PoolClient } from 'pg'

describe('sync/findItems copy connection helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('acquireCopyConnection()', () => {
    it('should delegate to knex.client.acquireConnection', async () => {
      const acquireStub = vi.fn().mockResolvedValue('THE_CLIENT')
      const knexFake = cast<Knex>({ client: { acquireConnection: acquireStub } })
      await Imports.acquireCopyConnection(knexFake)
      expect(acquireStub.mock.calls.length).toBe(1)
    })
    it('should return whatever knex.client.acquireConnection resolves with', async () => {
      const expected = { marker: 'pg-client' }
      const knexFake = cast<Knex>({ client: { acquireConnection: vi.fn().mockResolvedValue(expected) } })
      const result = await Imports.acquireCopyConnection(knexFake)
      expect(result).toBe(expected)
    })
  })

  describe('releaseCopyConnection()', () => {
    it('should delegate to knex.client.releaseConnection', async () => {
      const releaseStub = vi.fn().mockResolvedValue(undefined)
      const knexFake = cast<Knex>({ client: { releaseConnection: releaseStub } })
      await Imports.releaseCopyConnection(knexFake, cast<PoolClient>({}))
      expect(releaseStub.mock.calls.length).toBe(1)
    })
    it('should hand back the same client that was acquired', async () => {
      const releaseStub = vi.fn().mockResolvedValue(undefined)
      const knexFake = cast<Knex>({ client: { releaseConnection: releaseStub } })
      const client = cast<PoolClient>({ marker: 'client' })
      await Imports.releaseCopyConnection(knexFake, client)
      expect(releaseStub.mock.calls[0]?.[0]).toBe(client)
    })
  })
})
