'use sanity'

import type { Knex } from 'knex'
import { getDbChunkSize } from '#sync/syncItemsDialect.js'
import { cast } from '#testutils/typeGuards.js'

const fakeKnex = (clientName: string): Knex => cast<Knex>({ client: { config: { client: clientName } } })

describe('sync/syncItemsDialect getDbChunkSize()', () => {
  it('should return 5000 when client is postgresql', () => {
    expect(getDbChunkSize(fakeKnex('postgresql'))).toBe(5000)
  })

  it('should return 5000 when client is pg', () => {
    expect(getDbChunkSize(fakeKnex('pg'))).toBe(5000)
  })

  it('should return 200 when client is better-sqlite3', () => {
    expect(getDbChunkSize(fakeKnex('better-sqlite3'))).toBe(200)
  })

  it('should return 200 when client is sqlite3', () => {
    expect(getDbChunkSize(fakeKnex('sqlite3'))).toBe(200)
  })

  it('should return 200 for any non-postgres client', () => {
    expect(getDbChunkSize(fakeKnex('mysql'))).toBe(200)
  })
})
