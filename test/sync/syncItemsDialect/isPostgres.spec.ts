'use sanity'

import { expect } from 'chai'
import type { Knex } from 'knex'
import { isPostgres } from '#sync/syncItemsDialect.js'
import { cast } from '#testutils/typeGuards.js'

const fakeKnex = (clientName: string): Knex => cast<Knex>({ client: { config: { client: clientName } } })

describe('sync/syncItemsDialect isPostgres()', () => {
  it('should return true when client is postgresql', () => {
    expect(isPostgres(fakeKnex('postgresql'))).to.equal(true)
  })

  it('should return true when client is pg', () => {
    expect(isPostgres(fakeKnex('pg'))).to.equal(true)
  })

  it('should return false when client is sqlite3', () => {
    expect(isPostgres(fakeKnex('sqlite3'))).to.equal(false)
  })

  it('should return false when client is better-sqlite3', () => {
    expect(isPostgres(fakeKnex('better-sqlite3'))).to.equal(false)
  })

  it('should return false when client is mysql', () => {
    expect(isPostgres(fakeKnex('mysql'))).to.equal(false)
  })
})
