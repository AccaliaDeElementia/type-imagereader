'use sanity'

import { expect } from 'chai'
import type { Knex } from 'knex'
import { getDbChunkSize } from '#utils/syncItemsDialect.js'
import { Cast } from '#testutils/TypeGuards.js'

const fakeKnex = (clientName: string): Knex => Cast<Knex>({ client: { config: { client: clientName } } })

describe('utils/syncItemsDialect function getDbChunkSize()', () => {
  it('should return 5000 when client is postgresql', () => {
    expect(getDbChunkSize(fakeKnex('postgresql'))).to.equal(5000)
  })

  it('should return 5000 when client is pg', () => {
    expect(getDbChunkSize(fakeKnex('pg'))).to.equal(5000)
  })

  it('should return 200 when client is better-sqlite3', () => {
    expect(getDbChunkSize(fakeKnex('better-sqlite3'))).to.equal(200)
  })

  it('should return 200 when client is sqlite3', () => {
    expect(getDbChunkSize(fakeKnex('sqlite3'))).to.equal(200)
  })

  it('should return 200 for any non-postgres client', () => {
    expect(getDbChunkSize(fakeKnex('mysql'))).to.equal(200)
  })
})
